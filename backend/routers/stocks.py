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

@router.get("/trending")
async def get_trending_stocks(n: int = Query(8, le=20)):
    import asyncio
    import httpx
    import os
    
    try:
        # Get most active stocks as base
        most_active = await YFinanceService.get_most_active(20)
        if not most_active:
            return []
        
        # Get top gainers for cross-reference
        top_gainers = await YFinanceService.get_top_gainers(20)
        gainer_symbols = {s['symbol'] for s in top_gainers}
        
        # Load news headlines from Groq for context
        # Use existing news service if available
        trending_results = []
        
        for stock in most_active[:n]:
            symbol = stock.get('symbol', '')
            price = stock.get('price', 0)
            change_pct = stock.get('change_percent', 0)
            volume = stock.get('volume', 0)
            
            # Determine trending reason
            reasons = []
            
            if abs(change_pct) > 3:
                if change_pct > 0:
                    reasons.append("Strong surge today")
                else:
                    reasons.append("Sharp selloff today")
            
            if symbol in gainer_symbols:
                reasons.append("Top gainer")
                
            if volume > 1000000:
                reasons.append("Very high volume")
            elif volume > 500000:
                reasons.append("High trading activity")
            
            if abs(change_pct) > 5:
                reasons.append("Unusual price move")
            
            if not reasons:
                reasons.append("High market activity")
            
            # Try to get news reason
            try:
                base_symbol = symbol.replace('.NS', '')
                async with httpx.AsyncClient(timeout=5) as client:
                    news_url = f"https://news.google.com/rss/search?q={base_symbol}+NSE+stock&hl=en-IN&gl=IN&ceid=IN:en"
                    res = await client.get(news_url)
                    if res.status_code == 200 and '<title>' in res.text:
                        import re
                        titles = re.findall(r'<item>.*?<title>(.*?)</title>', res.text, re.DOTALL)
                        if titles and len(titles) > 1:
                            headline = titles[1][:60].strip()
                            if headline:
                                reasons = [headline + "..."]
            except:
                pass
            
            trending_results.append({
                "symbol": symbol,
                "name": stock.get('name', symbol.replace('.NS', '')),
                "price": price,
                "change_percent": round(change_pct, 2),
                "volume": volume,
                "reason": reasons[0] if reasons else "Trending now",
                "is_positive": change_pct >= 0
            })
        
        return trending_results
        
    except Exception as e:
        print(f"Trending error: {e}")
        return []

ETF_LIST = [
    {"symbol": "NIFTYBEES.NS", "name": "Nippon Nifty BeES ETF", "type": "etf"},
    {"symbol": "BANKBEES.NS", "name": "Nippon Bank BeES ETF", "type": "etf"},
    {"symbol": "GOLDBEES.NS", "name": "Nippon Gold BeES ETF", "type": "etf"},
    {"symbol": "SILVERBEES.NS", "name": "Nippon Silver BeES ETF", "type": "etf"},
    {"symbol": "JUNIORBEES.NS", "name": "Nippon Junior BeES ETF", "type": "etf"},
    {"symbol": "ITETF.NS", "name": "Nippon IT ETF", "type": "etf"},
    {"symbol": "MON100.NS", "name": "Motilal NASDAQ 100 ETF", "type": "etf"},
    {"symbol": "MAFANG.NS", "name": "Mirae FANG ETF", "type": "etf"},
    {"symbol": "PHARMABEES.NS", "name": "Nippon Pharma BeES ETF", "type": "etf"},
    {"symbol": "SETFNIF50.NS", "name": "SBI Nifty 50 ETF", "type": "etf"},
    {"symbol": "UTINIFTETF.NS", "name": "UTI Nifty 50 ETF", "type": "etf"},
    {"symbol": "HDFCNIFTY.NS", "name": "HDFC Nifty 50 ETF", "type": "etf"},
    {"symbol": "ICICIB22.NS", "name": "ICICI Nifty Next 50 ETF", "type": "etf"},
    {"symbol": "NETFIT.NS", "name": "Nippon India Nifty IT ETF", "type": "etf"},
]

INDEX_LIST = [
    {"symbol": "^NSEI", "name": "Nifty 50", "type": "index"},
    {"symbol": "^NSEBANK", "name": "Bank Nifty", "type": "index"},
    {"symbol": "^CNXMIDCAP", "name": "Nifty Midcap 100", "type": "index"},
    {"symbol": "^CNXSMALLCAP", "name": "Nifty Smallcap 100", "type": "index"},
    {"symbol": "^CNXIT", "name": "Nifty IT", "type": "index"},
    {"symbol": "^CNXPHARMA", "name": "Nifty Pharma", "type": "index"},
    {"symbol": "^CNXAUTO", "name": "Nifty Auto", "type": "index"},
    {"symbol": "^CNXFMCG", "name": "Nifty FMCG", "type": "index"},
    {"symbol": "^CNXMETAL", "name": "Nifty Metal", "type": "index"},
    {"symbol": "^CNXREALTY", "name": "Nifty Realty", "type": "index"},
]

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
            stock_results = [
                {**s, "type": "stock"} 
                for s in stocks 
                if q in s['symbol'].upper() or q in s['name'].upper()
            ][:10]
            
            etf_results = [e for e in ETF_LIST if q in e['symbol'].upper() or q in e['name'].upper()]
            index_results = [i for i in INDEX_LIST if q in i['symbol'].upper() or q in i['name'].upper()]
            
            results = stock_results + etf_results + index_results
            return {"query": q, "results": results}
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


