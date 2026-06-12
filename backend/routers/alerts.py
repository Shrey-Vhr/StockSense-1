from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from database import get_db
from models.user import User
from models.alerts import Alert
from routers.auth import get_current_user

router = APIRouter()

class AlertCreate(BaseModel):
    symbol: str
    alert_type: str # "price_above", "price_below", "rsi_above", "rsi_below", "volume_spike", "breakout"
    value: float
    notify_via: str = "browser"

@router.get("")
async def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_triggered == False).all()

@router.post("")
async def create_alert(alert: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Clean symbol
    symbol = alert.symbol.upper()
    if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
        symbol += '.NS'
        
    # Map 'alert_type' to condition
    condition = ""
    if "above" in alert.alert_type or alert.alert_type in ["volume_spike", "breakout"]:
        condition = ">"
    else:
        condition = "<"
        
    new_alert = Alert(
        user_id=current_user.id,
        symbol=symbol,
        alert_type=alert.alert_type,
        condition=condition,
        value=alert.value
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.delete("/{id}")
async def delete_alert(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    db.delete(alert)
    db.commit()
    return {"status": "success"}

@router.get("/triggered")
async def get_triggered_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_triggered == True).order_by(Alert.created_at.desc()).limit(20).all()
