from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# In routers/news.py
try:
  from services.news_service import (
    get_stock_news,
    get_market_news,
    get_nse_filings,
    sentiment_status
  )
except Exception as e:
  print(f"News service error: {e}")
  # Shown in the UI, so it says where to look rather than echoing the error.
  err_msg = "news service failed to load (see server log)"
  # Define fallback functions
  async def get_stock_news(*args, **kwargs):
    return {"articles": [], "error": err_msg}
  async def get_market_news(*args, **kwargs):
    return []
  async def get_nse_filings(*args, **kwargs):
    return []
  def sentiment_status():
    return {"enabled": False, "reason": err_msg, "model": None}

router = APIRouter()

@router.get("/stock/{symbol}")
async def get_stock_news_endpoint(symbol: str, company_name: str = Query(..., description="Company name used for better news matching"), limit: int = 20, refresh: bool = False):
    try:
        result = await get_stock_news(symbol, company_name, limit, force_refresh=refresh)
        return result
    except Exception:
        logger.exception("Stock news failed for %s", symbol)
        raise HTTPException(status_code=404, detail="News is unavailable for this symbol")

@router.get("/market")
async def get_market_news_endpoint(limit: int = 10):
    try:
        news = await get_market_news(limit)
        # Additive: existing consumers read .articles and are unaffected.
        return {"articles": news, "sentiment_available": sentiment_status()["enabled"]}
    except Exception:
        logger.exception("Market news failed")
        raise HTTPException(status_code=500, detail="Market news failed. See server logs.")

@router.get("/filings/{symbol}")
async def get_nse_filings_endpoint(symbol: str):
    try:
        filings = await get_nse_filings(symbol)
        return {"symbol": symbol, "filings": filings}
    except Exception:
        logger.exception("NSE filings failed for %s", symbol)
        raise HTTPException(status_code=500, detail="Filings failed. See server logs.")
