import logging
import pyotp
import time
import logzero
from SmartApi import SmartConnect
from config import settings

# SmartApi/smartConnect.py:134 calls `logzero.logfile(log_path, ...)` on import,
# which writes date-wise files to backend/logs/. On any failed request logzero
# records the *whole* request — headers included — so those files ended up
# holding the API key, session Bearer tokens, and the login body with the
# password and TOTP in plain text. They were committed to git before anyone
# noticed and had to be purged from history.
#
# Passing None detaches the file handler, so nothing is written to disk. Errors
# still surface on the console via the root logger.
logzero.logfile(None)
logzero.loglevel(logging.CRITICAL)

class AngelOneService:
  def __init__(self):
    self.api = None
    self.auth_token = None
    self.feed_token = None
    self.last_login = None
    self.is_connected = False
  
  def login(self):
    max_retries = 3
    
    for attempt in range(max_retries):
      try:
        self.api = SmartConnect(
          api_key=settings.ANGEL_ONE_API_KEY
        )
        
        # Wait for next TOTP window if retrying
        if attempt > 0:
          print(f"Retry {attempt} — waiting for "
                f"next TOTP window...")
          time.sleep(31)
        
        # Generate TOTP
        totp_obj = pyotp.TOTP(
          settings.ANGEL_ONE_TOTP_SECRET
        )
        totp = totp_obj.now()
        print(f"[Attempt {attempt+1}] TOTP: {totp}")
        
        # Login
        data = self.api.generateSession(
          settings.ANGEL_ONE_CLIENT_ID,
          settings.ANGEL_ONE_PASSWORD,
          totp
        )
        
        if data['status']:
          self.auth_token = data['data']['jwtToken']
          self.feed_token = self.api.getfeedToken()
          self.last_login = time.time()
          self.is_connected = True
          print("Angel One login successful!")
          return True
        else:
          error = data.get('errorcode', '')
          print(f"[Attempt {attempt+1}] Failed: "
                f"{data.get('message', '')}")
          
          # AB1050 = invalid TOTP — retry
          # Other errors — don't retry
          if error != 'AB1050':
            break
            
      except Exception as e:
        print(f"Angel One login error: {e}")
        if attempt == max_retries - 1:
          self.is_connected = False
          return False
    
    self.is_connected = False
    return False
  
  def ensure_logged_in(self):
    # Re-login if not connected
    if not self.is_connected or not self.last_login:
      return self.login()
    
    # Angel One tokens last ~24h
    # Re-login after 22 hours to be safe
    if time.time() - self.last_login > 79200:
      print("Angel One token expiring, re-logging...")
      return self.login()
    
    # Test if connection still alive
    try:
      profile = self.api.getProfile(self.auth_token)
      if not profile.get('status'):
        print("Angel One session dead, re-logging...")
        return self.login()
    except:
      return self.login()
    
    return True
  
  def get_quote(self, symbol):
    try:
      self.ensure_logged_in()
      if not self.is_connected:
        return None
      
      # Convert symbol format (HDFCBANK.NS -> HDFCBANK)
      clean_symbol = symbol.replace('.NS', '').replace('.BO', '')
      
      # Get LTP (Last Traded Price)
      ts, token = self.get_token_info(clean_symbol)
      if not token:
        return None
        
      data = self.api.ltpData('NSE', ts, token)
      
      if data['status']:
        ltp_data = data['data']
        return {
          'symbol': symbol,
          'current_price': float(ltp_data['ltp']),
          'open': float(ltp_data['open']),
          'high': float(ltp_data['high']),
          'low': float(ltp_data['low']),
          'close': float(ltp_data['close']),
          'change': float(ltp_data['ltp']) - float(ltp_data['close']),
          'change_percent': ((float(ltp_data['ltp']) - 
                             float(ltp_data['close'])) / 
                             float(ltp_data['close'])) * 100,
          'volume': int(ltp_data.get('tradingSymbol', 0)),
          'source': 'angel_one'
        }
    except Exception as e:
      print(f"Angel One quote error for {symbol}: {e}")
      return None
  
  def get_token_info(self, symbol):
    # Symbol to token mapping for NSE
    # Use Angel One instrument list
    try:
      instruments = self.api.searchScrip('NSE', symbol)
      if instruments['status'] and instruments['data']:
        # Prefer -EQ for equities
        for inst in instruments['data']:
            if inst.get('tradingsymbol') == f"{symbol}-EQ":
                return inst['tradingsymbol'], inst['symboltoken']
        # Fallback to exact match
        for inst in instruments['data']:
            if inst.get('tradingsymbol') == symbol:
                return inst['tradingsymbol'], inst['symboltoken']
        # Fallback to first available
        return instruments['data'][0]['tradingsymbol'], instruments['data'][0]['symboltoken']
    except:
      pass
    return symbol, None

  def get_token(self, symbol):
    _, token = self.get_token_info(symbol)
    return token
  
  def get_market_indices(self):
    try:
      self.ensure_logged_in()
      if not self.is_connected:
        return None
      
      indices = {}
      
      # Nifty 50 token: 99926000
      nifty = self.api.ltpData('NSE', 'Nifty 50', '99926000')
      if nifty['status']:
        d = nifty['data']
        indices['nifty50'] = {
          'price': float(d['ltp']),
          'change': float(d['ltp']) - float(d['close']),
          'change_percent': ((float(d['ltp']) - float(d['close'])) / 
                            float(d['close'])) * 100
        }
      
      # Bank Nifty token: 99926009
      banknifty = self.api.ltpData('NSE', 'Nifty Bank', '99926009')
      if banknifty['status']:
        d = banknifty['data']
        indices['banknifty'] = {
          'price': float(d['ltp']),
          'change': float(d['ltp']) - float(d['close']),
          'change_percent': ((float(d['ltp']) - float(d['close'])) / 
                            float(d['close'])) * 100
        }
      
      return indices
      
    except Exception as e:
      print(f"Angel One indices error: {e}")
      return None

# Global instance
angel_one = AngelOneService()
