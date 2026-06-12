from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from typing import List, Optional
from services.market_data import YFinanceService
from services.websocket_service import manager

router = APIRouter()

@router.get("/market-overview")
async def get_market_overview():
    try:
        data = await YFinanceService.get_market_overview()
        
        # Always return as array
        if isinstance(data, dict):
            # Convert object to array format
            result = []
            mapping = {
                'nifty50': {'symbol': '^NSEI', 'name': 'Nifty 50'},
                'banknifty': {'symbol': '^NSEBANK', 'name': 'Bank Nifty'},
                'niftyit': {'symbol': '^CNXIT', 'name': 'Nifty IT'},
            }
            for key, meta in mapping.items():
                if key in data:
                    entry = {**meta, **data[key]}
                    result.append(entry)
            return result
        
        if isinstance(data, list):
            return data
            
        return []
        
    except Exception as e:
        print(f"Market overview error: {e}")
        return []

@router.get("/sector-performance")
async def get_sector_performance():
    return await YFinanceService.get_sector_performance()

@router.get("/top-gainers")
async def get_top_gainers(n: int = Query(10, le=50)):
    return await YFinanceService.get_top_gainers(n)

@router.get("/top-losers")
async def get_top_losers(n: int = Query(10, le=50)):
    return await YFinanceService.get_top_losers(n)

@router.get("/most-active")
async def get_most_active(n: int = Query(10, le=50)):
    return await YFinanceService.get_most_active(n)

@router.get("/search")
async def search_stocks(q: str):
    import json
    import os
    q = q.upper()
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'nse_stocks.json')
    try:
        with open(path, 'r') as f:
            stocks = json.load(f)
            # Search by symbol or name
            results = [s for s in stocks if q in s['symbol'] or q in s['name'].upper()]
            return {"query": q, "results": results[:10]}
    except Exception:
        return {"query": q, "results": []}

@router.get("/quote/{symbol}")
async def get_stock_quote(symbol: str):
    try:
        import math

        def fix_nan_stocks(obj):
          if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
              return None
            return obj
          elif isinstance(obj, dict):
            return {k: fix_nan_stocks(v) 
                    for k, v in obj.items()}
          elif isinstance(obj, list):
            return [fix_nan_stocks(i) for i in obj]
          return obj
          
        quote = await YFinanceService.get_stock_quote(symbol)
        quote = fix_nan_stocks(quote)
        return quote
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/history/{symbol}")
async def get_stock_history(
    symbol: str, 
    period: str = Query("1y"), 
    interval: str = Query("1d")
):
    history = await YFinanceService.get_historical_data(symbol, period, interval)
    if not history:
        raise HTTPException(status_code=404, detail="Historical data not found or invalid symbol")
    return {"symbol": symbol, "history": history}

@router.get("/fundamentals/{symbol}")
async def get_stock_fundamentals(symbol: str):
    fundamentals = await YFinanceService.get_fundamentals(symbol)
    if not fundamentals:
        raise HTTPException(status_code=404, detail="Fundamentals not found")
    return fundamentals

@router.websocket("/ws/prices")
async def websocket_prices(
  websocket: WebSocket,
  symbol: str = None
):
  from services.price_broadcaster import broadcaster
  from services.angel_one_service import angel_one
  from services.angel_one_websocket import angel_ws
  import asyncio
  import json
  
  await websocket.accept()
  
  # Subscribe to symbol updates
  if symbol:
    broadcaster.subscribe(symbol, websocket)
    
    # Subscribe this token to Angel One feed
    token = angel_one.get_token(
      symbol.replace('.NS', '')
    )
    if token:
      broadcaster.token_to_symbol[token] = symbol
      angel_ws.subscribe([token])
  
  try:
    # Send current price immediately on connect
    quote = await YFinanceService.get_stock_quote(symbol) if symbol else None
    if quote:
      await websocket.send_text(json.dumps({
        "type": "price_update",
        "symbol": symbol,
        "price": quote['current_price'],
        "change": quote['change'],
        "change_percent": quote['change_percent']
      }))
    
    # Keep connection alive
    while True:
      try:
        # Wait for client messages (ping/pong)
        data = await asyncio.wait_for(
          websocket.receive_text(),
          timeout=30.0
        )
      except asyncio.TimeoutError:
        # Send ping to keep alive
        await websocket.send_text(
          json.dumps({"type": "ping"})
        )
      except Exception:
        break
        
  except Exception as e:
    print(f"WebSocket error: {e}")
  finally:
    if symbol:
      broadcaster.unsubscribe(symbol, websocket)
