from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Literal

from database import get_db
from models.user import User
from models.alerts import Alert
from routers.auth import get_current_user

router = APIRouter()

# Only the types services/alert_checker.py actually evaluates. The API used to
# accept RSI, volume and breakout alerts too, which were saved and then never
# fired.
MAX_ACTIVE_ALERTS = 100

class AlertCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    alert_type: Literal["price_above", "price_below"]
    value: float = Field(gt=0, lt=1e9, allow_inf_nan=False)
    notify_via: str = Field(default="browser", max_length=16)

@router.get("")
async def get_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Alert).filter(Alert.user_id == current_user.id, Alert.is_triggered == False).all()

@router.post("")
async def create_alert(alert: AlertCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active = db.query(Alert).filter(
        Alert.user_id == current_user.id, Alert.is_triggered == False
    ).count()
    if active >= MAX_ACTIVE_ALERTS:
        raise HTTPException(
            status_code=400,
            detail=f"You can have at most {MAX_ACTIVE_ALERTS} active alerts",
        )

    # Clean symbol
    symbol = alert.symbol.strip().upper()
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
async def get_triggered_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    triggered = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.is_triggered == True,
        Alert.notified == False
    ).all()
    
    result = []
    for a in triggered:
        result.append({
            'id': a.id,
            'symbol': a.symbol,
            'message': f"{a.symbol.replace('.NS','')} "
                       f"{a.alert_type} {a.condition} {a.value}"
        })
        a.notified = True
    
    db.commit()
    return result
