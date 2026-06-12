from services.screener_in_service import scrape_screener_fundamentals
from services.market_data import YFinanceService
import traceback
import asyncio

def get_fundamental_data(symbol: str) -> dict:
  print(f"[INFO] Fetching fundamentals for {symbol}")
  
  # ALWAYS try Screener.in first
  try:
    screener_data = scrape_screener_fundamentals(symbol)
    if screener_data and screener_data.get('source') == 'screener.in':
      print(f"[OK] Using Screener.in data for {symbol}")
      return screener_data
    else:
      print(f"[WARN] Screener.in returned no data for {symbol}")
  except Exception as e:
    print(f"[ERROR] Screener.in error: {e}")
    traceback.print_exc()
  
  print(f"[INFO] Falling back to yfinance for {symbol}")
  try:
      # YFinanceService.get_fundamentals is async, but we are running in a thread
      # Use a new event loop to run it
      loop = asyncio.new_event_loop()
      asyncio.set_event_loop(loop)
      yf_data = loop.run_until_complete(YFinanceService.get_fundamentals(symbol))
      loop.close()
      if yf_data:
          yf_data['source'] = 'yfinance'
          yf_data['fundamental_score'] = 50
          return yf_data
  except Exception as e:
      print(f"[ERROR] YFinance fallback error: {e}")
      traceback.print_exc()

  return {'symbol': symbol, 'source': 'error', 'fundamental_score': 50}
