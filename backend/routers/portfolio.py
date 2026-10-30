from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import asyncio
import logging
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field
import yfinance as yf

from database import get_db
from models.user import User
from models.portfolio import Portfolio, Holding, Trade
from routers.auth import get_current_user
from services.market_data import YFinanceService
from services.ai_service import AIService
from rate_limit import by_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Quantities and prices must be positive and finite. A zero or negative price
# used to reach the P&L maths, where it divided by zero.
_Quantity = Field(gt=0, lt=1e12, allow_inf_nan=False)
_Price = Field(gt=0, lt=1e9, allow_inf_nan=False)

# --- Schemas ---
class HoldingCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    quantity: float = _Quantity
    avg_buy_price: float = _Price
    buy_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=500)

class HoldingUpdate(BaseModel):
    quantity: float = _Quantity
    avg_buy_price: float = _Price

class TradeCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    trade_type: Literal["BUY", "SELL", "buy", "sell"]
    quantity: float = _Quantity
    price: float = _Price
    date: date

# --- Helpers ---
def normalize_symbol(symbol: str) -> str:
    """Upper-cases and defaults to NSE, so "tcs" and "TCS.NS" are one holding."""
    symbol = symbol.strip().upper()
    if symbol.endswith((".NS", ".BO")) or symbol.startswith("^"):
        return symbol
    return symbol + ".NS"

def _sector_for(symbol: str) -> str:
    try:
        return yf.Ticker(symbol).info.get("sector") or "General"
    except Exception:
        logger.warning("Sector lookup failed for %s", symbol)
        return "General"

def get_user_portfolio(db: Session, user_id: int) -> Portfolio:
    port = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
    if not port:
        port = Portfolio(user_id=user_id, name="My Portfolio")
        db.add(port)
        db.commit()
        db.refresh(port)
    return port

# --- Endpoints ---
@router.get("")
async def get_holdings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    holdings = db.query(Holding).filter(Holding.portfolio_id == port.id).all()
    
    # Fetch live prices
    symbols = [h.symbol for h in holdings]
    live_quotes = []
    if symbols:
        live_quotes = await YFinanceService._get_batch_quotes(symbols)
        
    price_map = {q['symbol']: q for q in live_quotes}
    
    result = []
    for h in holdings:
        q = price_map.get(h.symbol, {})
        current_price = q.get('price', h.avg_buy_price)
        pnl = (current_price - h.avg_buy_price) * h.quantity
        result.append({
            "id": h.id,
            "symbol": h.symbol,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": current_price,
            "change_percent": q.get('change_percent', 0),
            "pnl": pnl,
            "buy_date": h.buy_date,
            "notes": h.notes
        })
    return result

@router.post("/add")
async def add_holding(holding: HoldingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    symbol = normalize_symbol(holding.symbol)

    # Check if exists
    existing = db.query(Holding).filter(Holding.portfolio_id == port.id, Holding.symbol == symbol).first()
    if existing:
        # Update avg price
        total_val = (existing.quantity * existing.avg_buy_price) + (holding.quantity * holding.avg_buy_price)
        existing.quantity += holding.quantity
        existing.avg_buy_price = total_val / existing.quantity
    else:
        new_holding = Holding(
            portfolio_id=port.id,
            symbol=symbol,
            quantity=holding.quantity,
            avg_buy_price=holding.avg_buy_price,
            buy_date=holding.buy_date,
            notes=holding.notes
        )
        db.add(new_holding)
        
    db.commit()
    return {"status": "success"}

@router.put("/update/{id}")
async def update_holding(id: int, holding: HoldingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    db_holding = db.query(Holding).filter(Holding.id == id, Holding.portfolio_id == port.id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db_holding.quantity = holding.quantity
    db_holding.avg_buy_price = holding.avg_buy_price
    db.commit()
    return {"status": "success"}

@router.delete("/remove/{id}")
async def remove_holding(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    db_holding = db.query(Holding).filter(Holding.id == id, Holding.portfolio_id == port.id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db.delete(db_holding)
    db.commit()
    return {"status": "success"}

@router.post("/trade")
async def log_trade(trade: TradeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    
    new_trade = Trade(
        portfolio_id=port.id,
        symbol=normalize_symbol(trade.symbol),
        trade_type=trade.trade_type.upper(),
        quantity=trade.quantity,
        price=trade.price,
        date=trade.date,
        pnl=0 # Would calculate if sell
    )
    db.add(new_trade)
    db.commit()
    return {"status": "success"}

@router.get("/trades")
async def get_trades(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    return db.query(Trade).filter(Trade.portfolio_id == port.id).order_by(Trade.date.desc()).all()

@router.get("/performance")
async def get_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    holdings = db.query(Holding).filter(Holding.portfolio_id == port.id).all()
    
    symbols = [h.symbol for h in holdings]
    if not symbols:
        return {
            "total_invested": 0, "current_value": 0, "total_pnl": 0, "total_pnl_percent": 0,
            "best_performer": None, "worst_performer": None, "sector_allocation": {}
        }
        
    live_quotes = await YFinanceService._get_batch_quotes(symbols)
    price_map = {q['symbol']: q for q in live_quotes}
    
    total_inv = 0
    total_cur = 0
    best_pnl = -float('inf')
    worst_pnl = float('inf')
    best_perf = None
    worst_perf = None
    
    sector_alloc = {}
    
    for h in holdings:
        q = price_map.get(h.symbol, {})
        cp = q.get('price', h.avg_buy_price)
        
        inv = h.quantity * h.avg_buy_price
        cur = h.quantity * cp
        pnl = cur - inv
        
        total_inv += inv
        total_cur += cur
        
        pnl_pct = (pnl / inv * 100) if inv > 0 else 0
        if pnl_pct > best_pnl:
            best_pnl = pnl_pct
            best_perf = {"symbol": h.symbol, "pnl_percent": pnl_pct}
        if pnl_pct < worst_pnl:
            worst_pnl = pnl_pct
            worst_perf = {"symbol": h.symbol, "pnl_percent": pnl_pct}
            
        # yfinance blocks, so keep it off the event loop.
        sector = await asyncio.to_thread(_sector_for, h.symbol)
        sector_alloc[sector] = sector_alloc.get(sector, 0) + cur
            
    total_pnl = total_cur - total_inv
    total_pnl_pct = (total_pnl / total_inv * 100) if total_inv > 0 else 0
    
    return {
        "total_invested": total_inv,
        "current_value": total_cur,
        "total_pnl": total_pnl,
        "total_pnl_percent": total_pnl_pct,
        "best_performer": best_perf,
        "worst_performer": worst_perf,
        "sector_allocation": sector_alloc,
    }

# Shares the "ai" budget with routers/ai.py: it is the same Anthropic spend.
@router.post("/ai-review", dependencies=[Depends(by_user("ai", 10, 60))])
async def ai_review(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    port = get_user_portfolio(db, current_user.id)
    holdings = db.query(Holding).filter(Holding.portfolio_id == port.id).all()
    
    if not holdings:
        raise HTTPException(status_code=400, detail="Portfolio is empty")
        
    symbols = [h.symbol for h in holdings]
    live_quotes = await YFinanceService._get_batch_quotes(symbols)
    price_map = {q['symbol']: q for q in live_quotes}
    
    holdings_data = []
    for h in holdings:
        cp = price_map.get(h.symbol, {}).get('price', h.avg_buy_price)
        holdings_data.append({
            "symbol": h.symbol,
            "quantity": h.quantity,
            "avg_buy_price": h.avg_buy_price,
            "current_price": cp,
            "pnl_percent": ((cp - h.avg_buy_price) / h.avg_buy_price) * 100 if h.avg_buy_price else 0
        })
        
    review = await AIService.analyze_portfolio(holdings_data)
    if "error" in review:
        raise HTTPException(status_code=500, detail=review["error"])
        
    return review
