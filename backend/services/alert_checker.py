import asyncio
import logging
from sqlalchemy.orm import Session
from database import SessionLocal
from models.alerts import Alert
from services.market_data import YFinanceService

logger = logging.getLogger(__name__)

async def start_alert_checker():
    """
    Background loop running every 60 seconds to check active alerts against current prices.
    """
    logger.info("Starting background alert checker service...")
    while True:
        try:
            await check_alerts()
        except Exception as e:
            logger.error(f"Error in alert checker loop: {e}")
            
        await asyncio.sleep(60)

async def check_alerts():
    db: Session = SessionLocal()
    try:
        # Get all untriggered alerts
        active_alerts = db.query(Alert).filter(Alert.is_triggered == False).all()
        if not active_alerts:
            return
            
        symbols = list(set([a.symbol for a in active_alerts]))
        if not symbols:
            return
            
        # Bulk fetch quotes
        quotes = await YFinanceService._get_batch_quotes(symbols)
        price_map = {q['symbol']: q['price'] for q in quotes}
        
        triggered_notifications = []
        
        for alert in active_alerts:
            current_price = price_map.get(alert.symbol)
            if not current_price:
                continue
                
            triggered = False
            # Check conditions
            if alert.alert_type == "price_above" and current_price >= alert.value:
                triggered = True
            elif alert.alert_type == "price_below" and current_price <= alert.value:
                triggered = True
                
            # (In a full implementation, we'd pull technicals for RSI/Volume alerts here too)
            
            if triggered:
                alert.is_triggered = True
                
                notification = {
                    "id": alert.id,
                    "symbol": alert.symbol,
                    "type": alert.alert_type,
                    "value": alert.value,
                    "current_price": current_price,
                    "message": f"{alert.symbol} crossed {alert.value} (Current: {current_price})"
                }
                triggered_notifications.append(notification)
                
        if triggered_notifications:
            # The browser picks these up by polling /api/alerts/triggered
            # (hooks/useNotifications.js), which marks them notified.
            db.commit()
            logger.info(f"Triggered {len(triggered_notifications)} alerts.")
            
    finally:
        db.close()
