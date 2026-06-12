from typing import Dict, Set
import asyncio
import json

class PriceBroadcaster:
  def __init__(self):
    # Map of symbol -> set of WebSocket connections
    self.subscribers: Dict[str, Set] = {}
    # Latest prices cache
    self.latest_prices: Dict[str, float] = {}
    # Map of angel one token -> symbol
    self.token_to_symbol: Dict[str, str] = {}
  
  async def broadcast_price(self, symbol, price, change, change_pct):
    self.latest_prices[symbol] = price
    
    if symbol not in self.subscribers:
      return
    
    message = json.dumps({
      "type": "price_update",
      "symbol": symbol,
      "price": price,
      "change": change,
      "change_percent": change_pct,
    })
    
    # Send to all subscribers of this symbol
    dead_connections = set()
    for websocket in self.subscribers.get(symbol, set()):
      try:
        await websocket.send_text(message)
      except:
        dead_connections.add(websocket)
    
    # Remove dead connections
    for ws in dead_connections:
      self.subscribers[symbol].discard(ws)
  
  def subscribe(self, symbol, websocket):
    if symbol not in self.subscribers:
      self.subscribers[symbol] = set()
    self.subscribers[symbol].add(websocket)
  
  def unsubscribe(self, symbol, websocket):
    if symbol in self.subscribers:
      self.subscribers[symbol].discard(websocket)

broadcaster = PriceBroadcaster()
