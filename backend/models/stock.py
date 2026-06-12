from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.sql import func
from database import Base

class StockCache(Base):
    __tablename__ = "stock_cache"

    symbol = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    sector = Column(String)
    industry = Column(String)
    market_cap = Column(Float)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class PriceHistory(Base):
    __tablename__ = "price_history"

    symbol = Column(String, ForeignKey("stock_cache.symbol"), primary_key=True)
    date = Column(Date, primary_key=True)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)

class TechnicalSnapshot(Base):
    __tablename__ = "technical_snapshots"

    symbol = Column(String, ForeignKey("stock_cache.symbol"), primary_key=True)
    timestamp = Column(DateTime(timezone=True), primary_key=True, default=func.now())
    rsi = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    ema20 = Column(Float)
    ema50 = Column(Float)
    ema200 = Column(Float)
    adx = Column(Float)
    atr = Column(Float)
    vwap = Column(Float)
    obv = Column(Float)
