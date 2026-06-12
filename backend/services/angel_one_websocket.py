from SmartApi.smartWebSocketV2 import SmartWebSocketV2
from services.angel_one_service import angel_one
from config import settings
import json

class AngelOneWebSocket:
  def __init__(self):
    self.ws = None
    self.subscribed_tokens = []
    self.price_callbacks = []
    self.is_running = False
  
  def on_data(self, wsapp, message):
    from services.price_broadcaster import broadcaster
    import asyncio
    try:
      if isinstance(message, dict):
        token = str(message.get('token', ''))
        ltp = float(message.get('last_traded_price', 0)) / 100
        close = float(message.get('close_price', 0)) / 100
        
        if ltp > 0 and close > 0:
          change = ltp - close
          change_pct = (change / close) * 100
          
          # Get symbol from token mapping
          symbol = broadcaster.token_to_symbol.get(token)
          if symbol:
            # Broadcast to frontend subscribers
            try:
              # We need to run the async broadcast_price. 
              # SmartWebSocketV2 runs on a separate thread, so we use asyncio.run or create a new event loop
              loop = asyncio.new_event_loop()
              asyncio.set_event_loop(loop)
              loop.run_until_complete(
                broadcaster.broadcast_price(
                  symbol, ltp, change, change_pct
                )
              )
              loop.close()
            except Exception as e:
              # Depending on environment, asyncio.run might be enough
              try:
                  asyncio.run(
                    broadcaster.broadcast_price(
                      symbol, ltp, change, change_pct
                    )
                  )
              except Exception as e2:
                  print(f"Broadcast error: {e2}")
    except Exception as e:
      print(f"WebSocket data error: {e}")
  
  def on_error(self, wsapp, error):
    print(f"Angel One WebSocket error: {error}")
    self.is_running = False
  
  def on_close(self, wsapp):
    print("Angel One WebSocket closed")
    self.is_running = False
  
  def on_open(self, wsapp):
    print("Angel One WebSocket connected")
    self.is_running = True
    # Subscribe to tokens
    if self.subscribed_tokens:
      self.subscribe(self.subscribed_tokens)
  
  def connect(self):
    try:
      if not angel_one.is_connected:
        return False
      
      self.ws = SmartWebSocketV2(
        angel_one.auth_token,
        settings.ANGEL_ONE_API_KEY,
        settings.ANGEL_ONE_CLIENT_ID,
        angel_one.feed_token
      )
      
      self.ws.on_open = self.on_open
      self.ws.on_data = self.on_data
      self.ws.on_error = self.on_error
      self.ws.on_close = self.on_close
      
      self.ws.connect()
      return True
      
    except Exception as e:
      print(f"WebSocket connect error: {e}")
      return False
  
  def subscribe(self, tokens):
    try:
      token_list = [{"exchangeType": 1, "tokens": tokens}]
      self.ws.subscribe("correlation123", 1, token_list)
      self.subscribed_tokens = tokens
    except Exception as e:
      print(f"Subscribe error: {e}")
  
  def add_price_callback(self, callback):
    self.price_callbacks.append(callback)

angel_ws = AngelOneWebSocket()
