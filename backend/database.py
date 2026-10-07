from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# Connect string for SQLite needs special connect_args for threads
engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models here so metadata is registered
    from models.user import User, UserPreferences
    from models.stock import StockCache, PriceHistory, TechnicalSnapshot
    from models.portfolio import Portfolio, Holding, Trade
    from models.watchlist import Watchlist, WatchlistStock
    from models.alerts import Alert
    from models.screener import SavedScreener
    
    Base.metadata.create_all(bind=engine)

    # create_all never alters an existing table, so databases created before
    # saved_screeners had an owner need the column added by hand.
    cols = {c["name"] for c in inspect(engine).get_columns("saved_screeners")}
    if "user_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text(
                "ALTER TABLE saved_screeners ADD COLUMN user_id INTEGER REFERENCES users(id)"
            ))
