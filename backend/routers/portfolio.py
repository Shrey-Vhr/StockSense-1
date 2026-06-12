from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import date
from pydantic import BaseModel

from database import get_db
from models.user import User
from models.portfolio import Portfolio, Holding, Trade
from routers.auth import get_current_user
from services.market_data import YFinanceService
from services.ai_service import AIService

router = APIRouter()

# --- Schemas ---
class HoldingCreate(BaseModel):
    symbol: str
    quantity: float
    avg_buy_price: float
    buy_date: date = None
    notes: str = None

class HoldingUpdate(BaseModel):
    quantity: float
    avg_buy_price: float

class TradeCreate(BaseModel):
    symbol: str
    trade_type: str
    quantity: float
    price: float
    date: date
    
# --- Helpers ---
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
    
    # Check if exists
    existing = db.query(Holding).filter(Holding.portfolio_id == port.id, Holding.symbol == holding.symbol).first()
    if existing:
        # Update avg price
        total_val = (existing.quantity * existing.avg_buy_price) + (holding.quantity * holding.avg_buy_price)
        existing.quantity += holding.quantity
        existing.avg_buy_price = total_val / existing.quantity
    else:
        new_holding = Holding(
            portfolio_id=port.id,
            symbol=holding.symbol,
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
        symbol=trade.symbol,
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
            
        # Mock sector, normally from DB
        sector = "General" 
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
        "daily_pnl": total_cur * 0.01, # Mock for now
        "weekly_pnl": total_cur * 0.03,
        "monthly_pnl": total_cur * 0.08
    }

@router.post("/ai-review")
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
            "pnl_percent": ((cp - h.avg_buy_price) / h.avg_buy_price) * 100
        })
        
    review = await AIService.analyze_portfolio(holdings_data)
    if "error" in review:
        raise HTTPException(status_code=500, detail=review["error"])
        
    return review
