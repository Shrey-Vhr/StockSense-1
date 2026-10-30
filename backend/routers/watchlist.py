from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
import logging
import yfinance as yf

from database import get_db
from models.watchlist import Watchlist, WatchlistStock
from routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Generous for a personal app, but bounded so one account cannot fill the
# database or make a single request fan out to thousands of quote lookups.
MAX_WATCHLISTS = 25
MAX_STOCKS_PER_WATCHLIST = 100


class CreateWatchlistRequest(BaseModel):
  name: str = Field(min_length=1, max_length=100)


class AddStockRequest(BaseModel):
  symbol: str = Field(min_length=1, max_length=32)
  notes: Optional[str] = Field(default="", max_length=500)


# GET /watchlists — get all watchlists for user
@router.get("/")
def get_watchlists(
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user)
):
  watchlists = db.query(Watchlist).filter(
    Watchlist.user_id == current_user.id
  ).all()
  
  result = []
  for wl in watchlists:
    result.append({
      'id': wl.id,
      'name': wl.name,
      'stock_count': len(wl.stocks)
    })
  return result


# POST /watchlists — create new watchlist
@router.post("/")
def create_watchlist(
  body: CreateWatchlistRequest,
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user)
):
  count = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).count()
  if count >= MAX_WATCHLISTS:
    raise HTTPException(
      status_code=400,
      detail=f"You can have at most {MAX_WATCHLISTS} watchlists"
    )
  wl = Watchlist(
    user_id=current_user.id,
    name=body.name.strip()
  )
  db.add(wl)
  db.commit()
  db.refresh(wl)
  return {
    'id': wl.id,
    'name': wl.name,
    'message': 'Watchlist created'
  }


# DELETE /watchlists/{id} — delete watchlist
@router.delete("/{watchlist_id}")
def delete_watchlist(
  watchlist_id: int,
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user)
):
  wl = db.query(Watchlist).filter(
    Watchlist.id == watchlist_id,
    Watchlist.user_id == current_user.id
  ).first()
  
  if not wl:
    raise HTTPException(
      status_code=404,
      detail="Watchlist not found"
    )
  
  db.delete(wl)
  db.commit()
  return {'message': 'Watchlist deleted'}


# GET /watchlists/{id}/stocks — get stocks in watchlist
@router.get("/{watchlist_id}/stocks")
def get_watchlist_stocks(
  watchlist_id: int,
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user)
):
  wl = db.query(Watchlist).filter(
    Watchlist.id == watchlist_id,
    Watchlist.user_id == current_user.id
  ).first()
  
  if not wl:
    raise HTTPException(
      status_code=404,
      detail="Watchlist not found"
    )
  
  stocks = []
  for ws in wl.stocks:
    try:
      # Fetch live price
      ticker = yf.Ticker(ws.symbol)
      fast = ticker.fast_info
      price = round(
        getattr(fast, 'last_price', 0) or 0, 2
      )
      prev_close = round(
        getattr(fast, 'previous_close', 0) or 0, 2
      )
      change_pct = round(
        ((price - prev_close) / prev_close * 100)
        if prev_close else 0, 2
      )

      # Fetch 7d history for sparkline
      try:
          hist = ticker.history(period="7d")
          sparkline = hist['Close'].tolist() if not hist.empty else []
          # Ensure JSON serializable floats
          sparkline = [round(float(x), 2) for x in sparkline]
      except Exception:
          sparkline = []
          
    except Exception:
      logger.warning("Quote lookup failed for %s", ws.symbol)
      price = 0
      change_pct = 0
      sparkline = []
    
    stocks.append({
      'id': ws.id,
      'symbol': ws.symbol,
      'name': ws.symbol.replace('.NS', ''),
      'price': price,
      'change_pct': change_pct,
      'sparkline': sparkline,
      'notes': ws.notes,
      'added_at': ws.added_at.isoformat() 
                  if ws.added_at else None
    })
  
  return {
    'id': wl.id,
    'name': wl.name,
    'stocks': stocks
  }


# POST /watchlists/{id}/stocks — add stock
@router.post("/{watchlist_id}/stocks")
def add_stock_to_watchlist(
  watchlist_id: int,
  body: AddStockRequest,
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user)
):
  wl = db.query(Watchlist).filter(
    Watchlist.id == watchlist_id,
    Watchlist.user_id == current_user.id
  ).first()
  
  if not wl:
    raise HTTPException(
      status_code=404,
      detail="Watchlist not found"
    )
  
  # Clean the symbol first, then check for a duplicate. The check used to run
  # on the raw input, so "tcs" slipped past an existing "TCS.NS".
  symbol = body.symbol.strip().upper()
  if not symbol.endswith('.NS'):
    symbol = symbol + '.NS'

  existing = db.query(WatchlistStock).filter(
    WatchlistStock.watchlist_id == watchlist_id,
    WatchlistStock.symbol == symbol
  ).first()

  if existing:
    raise HTTPException(
      status_code=400,
      detail="Stock already in watchlist"
    )

  if len(wl.stocks) >= MAX_STOCKS_PER_WATCHLIST:
    raise HTTPException(
      status_code=400,
      detail=f"A watchlist can hold at most {MAX_STOCKS_PER_WATCHLIST} stocks"
    )

  ws = WatchlistStock(
    watchlist_id=watchlist_id,
    symbol=symbol,
    notes=body.notes
  )
  db.add(ws)
  db.commit()
  
  return {
    'message': f'{symbol} added to watchlist',
    'symbol': symbol
  }


# DELETE /watchlists/{id}/stocks/{stock_id}
@router.delete("/{watchlist_id}/stocks/{stock_id}")
def remove_stock_from_watchlist(
  watchlist_id: int,
  stock_id: int,
  db: Session = Depends(get_db),
  current_user = Depends(get_current_user)
):
  # Join to the parent so ownership is part of the lookup. Without it, anyone
  # who knew or guessed both ids could delete from another user's watchlist.
  ws = db.query(WatchlistStock).join(Watchlist).filter(
    WatchlistStock.id == stock_id,
    WatchlistStock.watchlist_id == watchlist_id,
    Watchlist.user_id == current_user.id
  ).first()
  
  if not ws:
    raise HTTPException(
      status_code=404,
      detail="Stock not found in watchlist"
    )
  
  db.delete(ws)
  db.commit()
  return {'message': 'Stock removed from watchlist'}
