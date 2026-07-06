from services.screener_in_service import scrape_screener_fundamentals
from services.market_data import YFinanceService
import traceback
import asyncio

def get_fundamental_data(symbol: str) -> dict:
  print(f"[INFO] Fetching fundamentals for {symbol}")
  
  screener_data = None
  try:
    screener_data = scrape_screener_fundamentals(symbol)
  except Exception as e:
    print(f"[ERROR] Screener.in error: {e}")
    traceback.print_exc()
  
  yf_data = None
  try:
      loop = asyncio.new_event_loop()
      asyncio.set_event_loop(loop)
      yf_data = loop.run_until_complete(YFinanceService.get_fundamentals(symbol))
      loop.close()
  except Exception as e:
      print(f"[ERROR] YFinance fallback error: {e}")
      traceback.print_exc()

  if screener_data and screener_data.get('source') == 'screener.in':
      if yf_data:
          screener_data['ps_ratio'] = yf_data.get('ps_ratio')
          screener_data['ev_ebitda'] = yf_data.get('ev_ebitda')
          screener_data['free_float'] = yf_data.get('free_float')
          screener_data['avg_52w'] = screener_data.get('avg_52w') or yf_data.get('avg_52w')
      print(f"[OK] Using Screener.in data for {symbol}")
      return screener_data

  if yf_data:
      print(f"[INFO] Falling back to yfinance for {symbol}")
      yf_data['source'] = 'yfinance'
      yf_data['fundamental_score'] = 50
      return yf_data

  return {'symbol': symbol, 'source': 'error', 'fundamental_score': 50}
