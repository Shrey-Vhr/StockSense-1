from fastapi import APIRouter, HTTPException, Query
from typing import Optional

# In routers/news.py
try:
  from services.news_service import (
    get_stock_news,
    get_market_news,
    get_nse_filings
  )
except Exception as e:
  print(f"News service error: {e}")
  err_msg = str(e)
  # Define fallback functions
  async def get_stock_news(*args, **kwargs):
    return {"articles": [], "error": err_msg}
  async def get_market_news(*args, **kwargs):
    return []
  async def get_nse_filings(*args, **kwargs):
    return []

router = APIRouter()

@router.get("/stock/{symbol}")
async def get_stock_news_endpoint(symbol: str, company_name: str = Query(..., description="Company name used for better news matching"), limit: int = 20, refresh: bool = False):
    try:
        result = await get_stock_news(symbol, company_name, limit, force_refresh=refresh)
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/market")
async def get_market_news_endpoint(limit: int = 10):
    try:
        news = await get_market_news(limit)
        return {"articles": news}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filings/{symbol}")
async def get_nse_filings_endpoint(symbol: str):
    try:
        filings = await get_nse_filings(symbol)
        return {"symbol": symbol, "filings": filings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
