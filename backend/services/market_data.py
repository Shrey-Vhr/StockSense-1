import yfinance as yf
import pandas as pd
import numpy as np
import time
import asyncio
from functools import wraps
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from services.angel_one_service import angel_one

# Simple TTLCache decorator
def ttl_cache(ttl_seconds):
    cache = {}
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            now = time.time()
            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < ttl_seconds:
                    return result
            result = await func(*args, **kwargs)
            cache[key] = (result, now)
            return result
        return wrapper
    return decorator

# A list of top NSE symbols to use for gainers/losers/most active since yfinance 
# doesn't have a direct Indian screener API.
NIFTY_50_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "BHARTIARTL.NS", 
    "SBIN.NS", "INFY.NS", "LICI.NS", "ITC.NS", "HINDUNILVR.NS",
    "LT.NS", "BAJFINANCE.NS", "HCLTECH.NS", "MARUTI.NS", "SUNPHARMA.NS",
    "TATAMOTORS.NS", "M&M.NS", "KOTAKBANK.NS", "NTPC.NS", "AXISBANK.NS",
    "TITAN.NS", "ONGC.NS", "ULTRACEMCO.NS", "POWERGRID.NS", "COALINDIA.NS",
    "BAJAJFINSV.NS", "ASIANPAINT.NS", "ADANIENT.NS", "HAL.NS", "JSWSTEEL.NS",
    "WIPRO.NS", "SIEMENS.NS", "TATASTEEL.NS", "ADANIPORTS.NS", "GRASIM.NS",
    "HINDALCO.NS", "VBL.NS", "DMART.NS", "NESTLEIND.NS", "DRREDDY.NS",
    "APOLLOHOSP.NS", "TECHM.NS", "CIPLA.NS", "BAJAJ-AUTO.NS", "BRITANNIA.NS",
    "TRENT.NS", "EICHERMOT.NS", "SBILIFE.NS", "HDFCLIFE.NS", "DIVISLAB.NS"
]

class YFinanceService:
    
    @staticmethod
    def _fetch_quote_sync(symbol: str):
        try:
            ticker = yf.Ticker(symbol)
            
            # METHOD 1: Most reliable - last 2 days history
            hist = ticker.history(period='2d', interval='1d')
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])
                prev_close = float(hist['Close'].iloc[-2]) if len(hist) > 1 else price
                change = price - prev_close
                change_pct = (change / prev_close) * 100 if prev_close else 0
                volume = int(hist['Volume'].iloc[-1]) if not pd.isna(hist['Volume'].iloc[-1]) else 0
                
                # Replace NaN with None
                price = None if pd.isna(price) else round(price, 2)
                change = None if pd.isna(change) else round(change, 2)
                change_pct = None if pd.isna(change_pct) else round(change_pct, 2)
                prev_close = None if pd.isna(prev_close) else round(prev_close, 2)
                
                return {
                    "symbol": symbol,
                    "current_price": price,
                    "change": change,
                    "change_percent": change_pct,
                    "volume": volume,
                    "prev_close": prev_close
                }
            
            # METHOD 2: Fallback - fast_info
            fast = ticker.fast_info
            price = fast.get('last_price') or fast.get('regularMarketPrice')
            if price:
                prev = fast.get('previous_close', price)
                return {
                    "symbol": symbol,
                    "current_price": round(float(price), 2),
                    "change": round(float(price - prev), 2),
                    "change_percent": round(float((price-prev)/prev*100), 2),
                    "volume": int(fast.get('three_month_average_volume', 0)),
                    "prev_close": round(float(prev), 2)
                }
                
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    async def get_stock_quote(symbol: str):
        # Try Angel One first
        if angel_one.is_connected:
            quote = await asyncio.to_thread(angel_one.get_quote, symbol)
            if quote:
                return quote

        # Never cached as per requirements
        if not symbol.endswith(".NS") and not symbol.endswith(".BO") and not symbol.startswith("^"):
            symbol = f"{symbol}.NS"
        return await asyncio.to_thread(YFinanceService._fetch_quote_sync, symbol)

    @staticmethod
    @ttl_cache(ttl_seconds=15 * 60) # 15 minutes cache
    async def get_historical_data(symbol: str, period: str = "1y", interval: str = "1d"):
        if not symbol.endswith(".NS") and not symbol.endswith(".BO") and not symbol.startswith("^"):
            symbol = f"{symbol}.NS"
        try:
            def _fetch():
                ticker = yf.Ticker(symbol)
                df = ticker.history(period=period, interval=interval)
                
                # Fix datetime index issues
                df.index = pd.to_datetime(df.index)
                if hasattr(df.index, 'tz') and df.index.tz:
                    df.index = df.index.tz_localize(None)
                    
                df.reset_index(inplace=True)
                # rename Date/Datetime column to date
                df = df.rename(columns={"Date": "date", "Datetime": "date"})
                # Convert timezone if needed, or to string
                df['date'] = df['date'].dt.strftime('%Y-%m-%d')
                # Lowercase columns
                df.columns = [c.lower() for c in df.columns]
                # Replace NaN with None for JSON serialization
                df = df.replace({np.nan: None})
                # Return list of dicts
                return df[['date', 'open', 'high', 'low', 'close', 'volume']].to_dict(orient="records")
            return await asyncio.to_thread(_fetch)
        except Exception as e:
            logger.error(f"Error fetching history for {symbol}: {e}")
            return []

    @staticmethod
    @ttl_cache(ttl_seconds=24 * 60 * 60) # 24 hours cache
    async def get_fundamentals(symbol: str):
        if not symbol.endswith(".NS"):
            symbol = f"{symbol}.NS"
        try:
            def _fetch():
                ticker = yf.Ticker(symbol)
                info = ticker.info
                return {
                    "symbol": symbol,
                    "pe_ratio": info.get("trailingPE"),
                    "pb_ratio": info.get("priceToBook"),
                    "eps": info.get("trailingEps"),
                    "roe": info.get("returnOnEquity"),
                    "roce": info.get("returnOnAssets"), # ROCE proxy
                    "debt_to_equity": info.get("debtToEquity"),
                    "promoter_holding": info.get("heldPercentInsiders"),
                    "dividend_yield": info.get("dividendYield")
                }
            return await asyncio.to_thread(_fetch)
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {symbol}: {e}")
            return {}

    @staticmethod
    @ttl_cache(ttl_seconds=60)
    async def get_market_overview():
        # Try Angel One first for indices
        if angel_one.is_connected:
            indices = await asyncio.to_thread(angel_one.get_market_indices)
            if indices:
                return indices

        indices = {
            "Nifty 50": "^NSEI",
            "Bank Nifty": "^NSEBANK",
            "Nifty IT": "^CNXIT",
            "Nifty Pharma": "^CNXPHARMA"
        }
        
        async def fetch_index(name, symbol):
            try:
                data = await asyncio.to_thread(YFinanceService._fetch_quote_sync, symbol)
                data['name'] = name
                return data
            except:
                return {"name": name, "symbol": symbol, "error": True}
                
        tasks = [fetch_index(name, sym) for name, sym in indices.items()]
        results = await asyncio.gather(*tasks)
        return results

    @staticmethod
    @ttl_cache(ttl_seconds=300)
    async def get_sector_performance():
        SECTORS = {
            "IT": "^CNXIT",
            "Banking": "^NSEBANK", 
            "Pharma": "^CNXPHARMA",
            "Auto": "^CNXAUTO",
            "FMCG": "^CNXFMCG",
            "Energy": "^CNXENERGY",
            "Metals": "^CNXMETAL",
            "Realty": "^CNXREALTY",
            "Media": "^CNXMEDIA",
            "Infrastructure": "^CNXINFRA",
            "PSU Bank": "^CNXPSUBANK",
            "Financial Services": "^CNXFIN"
        }
        
        SECTOR_TOP_STOCKS = {
            "IT": "TCS.NS",
            "Banking": "HDFCBANK.NS",
            "Pharma": "SUNPHARMA.NS",
            "Auto": "TATAMOTORS.NS",
            "FMCG": "ITC.NS",
            "Energy": "RELIANCE.NS",
            "Metals": "TATASTEEL.NS",
            "Realty": "DLF.NS",
            "Media": "ZEEL.NS",
            "Infrastructure": "LT.NS",
            "PSU Bank": "SBIN.NS",
            "Financial Services": "BAJFINANCE.NS"
        }

        all_symbols = list(SECTORS.values()) + list(SECTOR_TOP_STOCKS.values())
        quotes = await YFinanceService._get_batch_quotes(all_symbols)
        
        quote_lookup = {q['symbol']: q for q in quotes}
        
        results = []
        for name, sector_sym in SECTORS.items():
            top_sym = SECTOR_TOP_STOCKS[name]
            sector_q = quote_lookup.get(sector_sym, {})
            top_q = quote_lookup.get(top_sym, {})
            
            # Some indices might not return quotes gracefully depending on the hour or yf status
            if not sector_q:
                # Fallback to slow sync method for index if batch fails
                try:
                    fallback_data = await asyncio.to_thread(YFinanceService._fetch_quote_sync, sector_sym)
                    sector_q = {"change_percent": fallback_data.get("change_percent", 0.0)}
                except:
                    sector_q = {"change_percent": 0.0}

            results.append({
                "sector": name,
                "change_percent": sector_q.get("change_percent", 0.0),
                "top_stock": top_sym.replace('.NS', ''),
                "top_stock_change": top_q.get("change_percent", 0.0),
                "market_cap": top_q.get("market_cap", 0)
            })
            
        return results

    @staticmethod
    async def _get_batch_quotes(symbols):
        def _fetch():
            tickers = yf.Tickers(" ".join(symbols))
            results = []
            for sym in symbols:
                try:
                    ticker = tickers.tickers[sym]
                    info = ticker.fast_info
                    
                    try:
                        current = info.last_price
                    except Exception:
                        current = None
                    if not current:
                        current = ticker.info.get('regularMarketPrice')
                        
                    try:
                        prev = info.previous_close
                    except Exception:
                        prev = None
                    if not prev:
                        prev = ticker.info.get('regularMarketPreviousClose')
                        
                    try:
                        vol = info.last_volume
                    except Exception:
                        vol = None
                    if not vol:
                        vol = ticker.info.get('volume', 0)
                        
                    try:
                        mcap = info.market_cap
                    except Exception:
                        mcap = None
                    if not mcap:
                        mcap = ticker.info.get('marketCap', 0)

                    if current and prev:
                        pct = (current - prev) / prev * 100
                        results.append({
                            "symbol": sym,
                            "price": current,
                            "change_percent": pct,
                            "volume": vol,
                            "market_cap": mcap
                        })
                except:
                    pass
            return results
        return await asyncio.to_thread(_fetch)

    @staticmethod
    @ttl_cache(ttl_seconds=60 * 5)
    async def get_top_gainers(n: int = 10):
        quotes = await YFinanceService._get_batch_quotes(NIFTY_50_SYMBOLS)
        gainers = sorted([q for q in quotes if q['change_percent'] > 0], key=lambda x: x['change_percent'], reverse=True)
        return gainers[:n]

    @staticmethod
    @ttl_cache(ttl_seconds=60 * 5)
    async def get_top_losers(n: int = 10):
        quotes = await YFinanceService._get_batch_quotes(NIFTY_50_SYMBOLS)
        losers = sorted([q for q in quotes if q['change_percent'] < 0], key=lambda x: x['change_percent'])
        return losers[:n]

    @staticmethod
    @ttl_cache(ttl_seconds=60 * 5)
    async def get_most_active(n: int = 10):
        quotes = await YFinanceService._get_batch_quotes(NIFTY_50_SYMBOLS)
        active = sorted(quotes, key=lambda x: x['volume'], reverse=True)
        return active[:n]
