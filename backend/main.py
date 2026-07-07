from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, init_db

from contextlib import asynccontextmanager
import asyncio
import logging

# Suppress noisy yfinance error logs
logging.getLogger('yfinance').setLevel(
  logging.CRITICAL
)
logging.getLogger('peewee').setLevel(
  logging.CRITICAL
)

# Create DB tables (if they don't exist yet)
init_db()

from services.websocket_service import start_websocket_services
from services.screener_service import setup_scheduler
from services.alert_checker import start_alert_checker
from services.angel_one_service import angel_one

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    init_db()
    
    # Login to Angel One
    print("Connecting to Angel One SmartAPI...")
    success = angel_one.login()
    if success:
        print("Angel One connected successfully!")
    else:
        print("Angel One connection failed, using yfinance fallback")

    # Startup: Start background tasks
    await start_websocket_services()
    
    # Initialize APScheduler
    setup_scheduler()
    
    # Start looping checkers
    asyncio.create_task(start_alert_checker())
    yield
    # Shutdown logic if any

app = FastAPI(title="StockSense API", lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Only THEN import and include routers
from routers import auth, stocks, analysis, screener, news, portfolio, alerts, ai, watchlist

# Include all module routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stocks"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(screener.router, prefix="/api/screener", tags=["Screener"])
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Insights"])
app.include_router(
    watchlist.router,
    prefix="/api/watchlists",
    tags=["watchlists"]
)

@app.get("/")
def read_root():
    return {"message": "Welcome to StockSense API"}

from services.websocket_service import manager
import json

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
  await websocket.accept()
  try:
    while True:
      try:
        data = await asyncio.wait_for(
          websocket.receive_text(),
          timeout=30.0
        )
        await websocket.send_json({
          "type": "pong",
          "status": "connected"
        })
      except asyncio.TimeoutError:
        await websocket.send_json({"type": "ping"})
      except Exception:
        break
  except Exception as e:
    print(f"WS error: {e}")
  finally:
    try:
      await websocket.close()
    except:
      pass


@app.get("/api/angel-one/status")
def get_angel_one_status():
    return {
        "connected": angel_one.is_connected,
        "last_login": angel_one.last_login,
        "data_source": "angel_one" if angel_one.is_connected else "yfinance"
    }
