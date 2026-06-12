import asyncio
import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # In-memory cache for latest prices
        self.latest_prices: Dict[str, float] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to a client: {e}")
                self.disconnect(connection)

    def update_cache(self, symbol: str, price: float):
        self.latest_prices[symbol] = price

manager = ConnectionManager()

# Global set of subscribed symbols across all clients
subscribed_symbols = set()

# Background task to poll prices if Angel One is unavailable
async def poll_prices_fallback():
    from services.market_data import YFinanceService
    from services.angel_one_service import angel_one
    
    logger.info("Starting fallback polling service for real-time prices...")
    while True:
        try:
            # If Angel One is connected, skip polling
            if angel_one.is_connected:
                await asyncio.sleep(30)
                continue

            if not manager.active_connections or not subscribed_symbols:
                await asyncio.sleep(10)
                continue
                
            # Poll currently active symbols
            symbols_to_poll = list(subscribed_symbols)
            
            quotes = await YFinanceService._get_batch_quotes(symbols_to_poll)
            updates = []
            
            for q in quotes:
                manager.update_cache(q['symbol'], q['price'])
                updates.append({
                    "symbol": q['symbol'],
                    "price": q['price'],
                    "change_percent": q['change_percent'],
                    "volume": q['volume']
                })
            
            if updates:
                await manager.broadcast(json.dumps({
                    "type": "price_update",
                    "source": "polling",
                    "data": updates
                }))
                
        except Exception as e:
            logger.error(f"Error in price polling fallback: {e}")
            
        await asyncio.sleep(30) # Poll every 30 seconds

# Function to connect to Angel One SmartAPI WebSocket
async def connect_angel_one_ws():
    from config import settings
    from services.angel_one_service import angel_one
    from services.angel_one_websocket import angel_ws
    
    if not settings.ANGEL_ONE_API_KEY or not settings.ANGEL_ONE_CLIENT_ID:
        logger.warning("Angel One credentials missing. Relying entirely on yfinance fallback.")
        return
        
    try:
        def on_price_update(data):
            token = data.get('token')
            price = data.get('price')
            
            # Find symbol by token
            symbol = getattr(angel_ws, '_token_map', {}).get(token)
            if symbol and price:
                manager.update_cache(symbol, price)
                # Broadcast immediately or let a loop broadcast?
                # We can broadcast directly
                asyncio.run_coroutine_threadsafe(
                    manager.broadcast(json.dumps({
                        "type": "price_update",
                        "source": "angel_one",
                        "data": [{
                            "symbol": symbol,
                            "price": price,
                            "timestamp": data.get('timestamp')
                        }]
                    })),
                    asyncio.get_running_loop()
                )

        angel_ws.add_price_callback(on_price_update)
        connected = await asyncio.to_thread(angel_ws.connect)
        if connected:
            logger.info("Angel One WS connected successfully!")
        else:
            logger.warning("Angel One WS connection failed. Falling back to polling.")
    except Exception as e:
        logger.error(f"Angel One WS initialization failed: {e}. Falling back to polling.")

# Initialization function to run when FastAPI starts
async def start_websocket_services():
    asyncio.create_task(connect_angel_one_ws())
    asyncio.create_task(poll_prices_fallback())
