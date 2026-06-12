from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, ForeignKey("stock_cache.symbol"), nullable=False)
    alert_type = Column(String, nullable=False)  # PRICE_ABOVE, PRICE_BELOW, VOLUME_ABOVE, etc.
    condition = Column(String, nullable=False) # e.g. '>', '<'
    value = Column(Float, nullable=False)
    is_triggered = Column(Boolean, default=False)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
