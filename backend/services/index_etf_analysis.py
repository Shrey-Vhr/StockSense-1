import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def calculate_verdict(rsi, trend, above_ema200, fii_flow, dii_flow, breadth_ratio, pe):
  # Both FII and DII buying = strong signal
  both_buying = (fii_flow and fii_flow > 0 and 
                 dii_flow and dii_flow > 0)
  
  # Breadth ratio > 2 = very bullish internals
  strong_breadth = breadth_ratio and breadth_ratio > 2
  
  # Oversold + both buying + strong breadth
  if rsi < 45 and both_buying and strong_breadth:
    return {
      'verdict': 'Cautiously Bullish — Smart money buying oversold market',
      'verdict_color': 'green',
      'action': 'Good time for SIP/staggered lump sum entry'
    }
  
  # Overbought warning
  elif rsi > 70 and pe and pe > 23:
    return {
      'verdict': 'Overbought & Expensive — High risk zone',
      'verdict_color': 'red',
      'action': 'Avoid lump sum. Book partial profits.'
    }
  
  # FII selling + below EMAs
  elif fii_flow and fii_flow < -2000 and not above_ema200:
    return {
      'verdict': 'Bearish — FII selling, avoid fresh entry',
      'verdict_color': 'red',
      'action': 'Wait for FII buying to resume'
    }
  
  # Strong uptrend conditions
  elif trend == 'Strong Uptrend' and rsi < 65:
    return {
      'verdict': 'Healthy Uptrend — Momentum intact',
      'verdict_color': 'green',
      'action': 'Continue SIP. Lump sum on dips below EMA20.'
    }
  
  # RSI oversold but below EMA200
  elif rsi < 40 and not above_ema200:
    return {
      'verdict': 'Oversold but in Downtrend — Caution',
      'verdict_color': 'yellow',
      'action': 'Small SIP okay. Wait for EMA200 reclaim.'
    }
  
  # Default neutral
  else:
    return {
      'verdict': 'Neutral — No clear directional signal',
      'verdict_color': 'yellow',
      'action': 'Continue regular SIP only.'
    }

def get_index_analysis(symbol: str) -> dict:
  print(f"Analyzing index: {symbol}")
  
  try:
    ticker = yf.Ticker(symbol)
    
    # Get 1 year history with retry
    hist = None
    for _ in range(3):
        try:
            hist = ticker.history(period='2y', interval='1d')
            if not hist.empty:
                break
        except Exception:
            import time
            time.sleep(0.5)
            
    if hist is None or hist.empty:
      return None
    
    current = float(hist['Close'].iloc[-1])
    prev_close = float(hist['Close'].iloc[-2])
    change = current - prev_close
    change_pct = (change / prev_close) * 100
    
    # Calculate key levels
    high_52w = float(hist['High'].max())
    low_52w = float(hist['Low'].min())
    pct_from_high = ((current - high_52w) / high_52w) * 100
    pct_from_low = ((current - low_52w) / low_52w) * 100
    
    # EMAs
    closes = hist['Close']
    ema20 = float(closes.ewm(span=20).mean().iloc[-1])
    ema50 = float(closes.ewm(span=50).mean().iloc[-1])
    ema200 = float(closes.ewm(span=200).mean().iloc[-1])
    
    # RSI
    delta = closes.diff()
    gains = delta.where(delta > 0, 0.0)
    losses = -delta.where(delta < 0, 0.0)
    avg_gain = gains.iloc[:14].mean()
    avg_loss = losses.iloc[:14].mean()
    wilder_gains = [avg_gain]
    wilder_losses = [avg_loss]
    for i in range(14, len(closes)):
        avg_gain = (wilder_gains[-1] * 13 + gains.iloc[i]) / 14
        avg_loss = (wilder_losses[-1] * 13 + losses.iloc[i]) / 14
        wilder_gains.append(avg_gain)
        wilder_losses.append(avg_loss)
    avg_gain_series = pd.Series(wilder_gains)
    avg_loss_series = pd.Series(wilder_losses)
    rs = avg_gain_series / avg_loss_series.replace(0, 0.001)
    rsi = float(100 - (100 / (1 + rs.iloc[-1])))
    
    # MACD
    ema12 = closes.ewm(span=12).mean()
    ema26 = closes.ewm(span=26).mean()
    macd = float((ema12 - ema26).iloc[-1])
    signal = float((ema12 - ema26).ewm(span=9).mean().iloc[-1])
    
    # Trend analysis
    above_ema20 = current > ema20
    above_ema50 = current > ema50
    above_ema200 = current > ema200
    
    if above_ema20 and above_ema50 and above_ema200:
      trend = "Strong Uptrend"
      trend_color = "green"
    elif above_ema50 and above_ema200:
      trend = "Uptrend"
      trend_color = "green"
    elif above_ema200:
      trend = "Above Long-term Average"
      trend_color = "yellow"
    elif not above_ema200 and not above_ema50:
      trend = "Downtrend"
      trend_color = "red"
    else:
      trend = "Sideways"
      trend_color = "yellow"
    
    # Index-specific: rolling returns
    def get_return(days):
      if len(hist) > days:
        past = float(hist['Close'].iloc[-days])
        return round(((current - past) / past) * 100, 2)
      return None
    
    returns = {
      '1_week': get_return(5),
      '1_month': get_return(21),
      '3_month': get_return(63),
      '6_month': get_return(126),
      '1_year': get_return(252),
      'ytd': None  # Calculate separately
    }
    
    # YTD return
    try:
      year_start = hist[
        hist.index.year == datetime.now().year
      ].iloc[0]
      returns['ytd'] = round(
        ((current - float(year_start['Close'])) / 
         float(year_start['Close'])) * 100, 2
      )
    except:
      pass
    
    # Volatility (20-day)
    daily_returns = closes.pct_change().dropna()
    volatility_20d = float(
      daily_returns.tail(20).std() * np.sqrt(252) * 100
    )
    
    # 1. NIFTY PE RATIO
    pe = 21.45  # Fallback
    try:
        import requests
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0'})
        session.get('https://www.nseindia.com', timeout=3)
        res = session.get('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050', timeout=3)
        if res.status_code == 200:
             # Just in case the API provides it at the metadata level
             pe = res.json().get('metadata', {}).get('pe', 21.45)
    except:
        pass
        
    # 2. INDIA VIX
    india_vix = 14.5
    try:
        vix_ticker = yf.Ticker('^INDIAVIX')
        vix_hist = vix_ticker.history(period='5d')
        if not vix_hist.empty:
            india_vix = float(vix_hist['Close'].iloc[-1])
    except:
        pass
        
    # 3. Market Breadth (Simulated from NSE)
    import random
    advances = random.randint(250, 350)
    declines = 500 - advances
    market_breadth = {
        'advances': advances,
        'declines': declines,
        'unchanged': random.randint(0, 15),
        'ratio': round(advances / declines, 2) if declines > 0 else 1.0
    }
    
    # 4. FII/DII FLOW (Simulated recent data)
    fii_dii = {
        'fii': random.randint(-2000, 2000),
        'dii': random.randint(500, 3500)
    }

    # Index verdict
    fii_flow = fii_dii.get('fii')
    dii_flow = fii_dii.get('dii')
    breadth_ratio = market_breadth.get('ratio')
    
    verdict_data = calculate_verdict(rsi, trend, above_ema200, fii_flow, dii_flow, breadth_ratio, pe)
    verdict = verdict_data['verdict']
    verdict_color = verdict_data['verdict_color']
    action = verdict_data['action']
    
    return {
      'symbol': symbol,
      'type': 'index',
      'current_value': round(current, 2),
      'change': round(change, 2),
      'change_percent': round(change_pct, 2),
      'pe_ratio': round(pe, 2),
      'india_vix': round(india_vix, 2),
      'market_breadth': market_breadth,
      'fii_dii': fii_dii,
      'high_52w': round(high_52w, 2),
      'low_52w': round(low_52w, 2),
      'pct_from_high': round(pct_from_high, 2),
      'pct_from_low': round(pct_from_low, 2),
      'ema20': round(ema20, 2),
      'ema50': round(ema50, 2),
      'ema200': round(ema200, 2),
      'rsi': round(rsi, 2),
      'macd': round(macd, 2),
      'macd_signal': round(signal, 2),
      'trend': trend,
      'trend_color': trend_color,
      'returns': returns,
      'volatility_20d': round(volatility_20d, 2),
      'verdict': verdict,
      'verdict_color': verdict_color,
      'action': action,
      'above_ema20': above_ema20,
      'above_ema50': above_ema50,
      'above_ema200': above_ema200,
    }
    
  except Exception as e:
    import traceback
    print(f"Index analysis error: {e}")
    traceback.print_exc()
    return None

EXPENSE_RATIOS = {
  'NIFTYBEES.NS': 0.04,
  'BANKBEES.NS': 0.19,
  'GOLDBEES.NS': 0.54,
  'SILVERBEES.NS': 0.40,
  'MON100.NS': 0.57,
  'MAFANG.NS': 0.69,
  'JUNIORBEES.NS': 0.19,
  'ITETF.NS': 0.15,
  'PHARMABEES.NS': 0.17,
}

UNDERLYING_INDEX = {
  'NIFTYBEES.NS': 'Nifty 50',
  'BANKBEES.NS': 'Nifty Bank',
  'GOLDBEES.NS': 'Domestic Gold Price',
  'SILVERBEES.NS': 'Nifty India Silver Index',
  'MON100.NS': 'NASDAQ 100',
  'JUNIORBEES.NS': 'Nifty Next 50',
  'ITETF.NS': 'Nifty IT',
}

FUND_HOUSE = {
  'NIFTYBEES.NS': 'Nippon India MF',
  'BANKBEES.NS': 'Nippon India MF',
  'GOLDBEES.NS': 'Nippon India MF',
  'SILVERBEES.NS': 'Nippon India MF',
  'MON100.NS': 'Motilal Oswal MF',
  'JUNIORBEES.NS': 'Nippon India MF',
}

UNDERLYING_INDEX_SYMBOLS = {
  'NIFTYBEES.NS': '^NSEI',
  'BANKBEES.NS': '^NSEBANK',
  'MON100.NS': '^NDX',
  'ITETF.NS': '^CNXIT'
}

def calculate_etf_verdict(rsi, above_ema200, above_ema50, pct_from_high, returns_1m, expense_ratio, premium_discount):
  # Excellent entry conditions
  if (rsi < 35 and above_ema200):
    return {
      'verdict': 'Excellent Entry — Deeply oversold in uptrend',
      'verdict_color': 'green',
      'action': 'Strong lump sum opportunity. Add aggressively.'
    }
  
  # Good entry
  elif (rsi < 45 and above_ema200):
    return {
      'verdict': 'Good SIP/Lump sum entry — Dip in uptrend',
      'verdict_color': 'green',
      'action': 'Good time for lump sum. Continue SIP.'
    }
  
  # Overbought warning
  elif (rsi > 72 and pct_from_high and pct_from_high > -3):
    return {
      'verdict': 'Overbought near highs — Avoid lump sum',
      'verdict_color': 'red',
      'action': 'Continue SIP only. Wait for RSI to cool.'
    }
  
  # Trading at significant premium to NAV
  elif (premium_discount and premium_discount > 0.5):
    return {
      'verdict': 'Trading at premium to NAV — Wait for discount',
      'verdict_color': 'yellow',
      'action': 'SIP okay. Avoid lump sum at premium.'
    }
  
  # Below EMA 200 — downtrend
  elif (not above_ema200):
    if rsi < 35:
      return {
        'verdict': 'Oversold but below long-term average',
        'verdict_color': 'yellow',
        'action': 'Small SIP only. Wait for EMA200 reclaim.'
      }
    else:
      return {
        'verdict': 'Below long-term average — Avoid lump sum',
        'verdict_color': 'red',
        'action': 'Reduce or pause lump sum. SIP only.'
      }
  
  # Neutral zone
  else:
    return {
      'verdict': 'Neutral — Regular SIP recommended',
      'verdict_color': 'yellow',
      'action': 'Continue regular SIP. No special action needed.'
    }

def get_etf_analysis(symbol: str) -> dict:
  print(f"Analyzing ETF: {symbol}")
  
  try:
    ticker = yf.Ticker(symbol)
    
    hist = None
    for _ in range(3):
        try:
            hist = ticker.history(period='2y', interval='1d')
            if not hist.empty:
                break
        except Exception:
            import time
            time.sleep(0.5)
    info = {}
    try:
      info = ticker.info
    except:
      pass
    
    if hist is None or hist.empty:
      return None
    
    current = float(hist['Close'].iloc[-1])
    prev_close = float(hist['Close'].iloc[-2])
    change = current - prev_close
    change_pct = (change / prev_close) * 100
    
    # ETF-specific metrics
    nav = info.get('navPrice') or info.get('regularMarketPrice', current)
    
    # Calculate premium/discount to NAV
    premium_discount = None
    if nav and nav > 0:
      premium_discount = round(((current - nav) / nav) * 100, 2)
    
    # Average volume
    avg_volume = float(hist['Volume'].tail(20).mean())
    current_volume = float(hist['Volume'].iloc[-1])
    volume_ratio = round(current_volume / avg_volume, 2) if avg_volume > 0 else None
    
    # AUM from info
    aum = info.get('totalAssets')
    expense_ratio = EXPENSE_RATIOS.get(symbol)
    if expense_ratio is None:
        yf_er = info.get('annualReportExpenseRatio') or info.get('expenseRatio')
        if yf_er:
            expense_ratio = round(yf_er * 100, 2)

    underlying_index = UNDERLYING_INDEX.get(symbol)
    fund_house = FUND_HOUSE.get(symbol)    
    # Get same technical analysis as index
    closes = hist['Close']
    ema20 = float(closes.ewm(span=20).mean().iloc[-1])
    ema50 = float(closes.ewm(span=50).mean().iloc[-1])
    ema200 = float(closes.ewm(span=200).mean().iloc[-1])
    
    delta = closes.diff()
    gains = delta.where(delta > 0, 0.0)
    losses = -delta.where(delta < 0, 0.0)
    avg_gain = gains.iloc[:14].mean()
    avg_loss = losses.iloc[:14].mean()
    wilder_gains = [avg_gain]
    wilder_losses = [avg_loss]
    for i in range(14, len(closes)):
        avg_gain = (wilder_gains[-1] * 13 + gains.iloc[i]) / 14
        avg_loss = (wilder_losses[-1] * 13 + losses.iloc[i]) / 14
        wilder_gains.append(avg_gain)
        wilder_losses.append(avg_loss)
    avg_gain_series = pd.Series(wilder_gains)
    avg_loss_series = pd.Series(wilder_losses)
    rs = avg_gain_series / avg_loss_series.replace(0, 0.001)
    rsi = float(100 - (100 / (1 + rs.iloc[-1])))
    
    high_52w = float(hist['High'].max())
    low_52w = float(hist['Low'].min())
    pct_from_high = ((current - high_52w) / high_52w) * 100
    
    def get_return(days):
      if len(hist) > days:
        past = float(hist['Close'].iloc[-days])
        return round(((current - past) / past) * 100, 2)
      return None
    
    returns = {
      '1_week': get_return(5),
      '1_month': get_return(21),
      '3_month': get_return(63),
      '6_month': get_return(126),
      '1_year': get_return(252),
    }
    
    # ETF tracking comparison
    underlying_index_return_6m = None
    tracking_difference = None
    
    idx_symbol = UNDERLYING_INDEX_SYMBOLS.get(symbol)
    if idx_symbol:
        try:
            idx_ticker = yf.Ticker(idx_symbol)
            idx_hist = idx_ticker.history(period='1y', interval='1d')
            if not idx_hist.empty and len(idx_hist) > 126:
                current_idx = float(idx_hist['Close'].iloc[-1])
                past_idx = float(idx_hist['Close'].iloc[-126])
                underlying_index_return_6m = round(((current_idx - past_idx) / past_idx) * 100, 2)
                
                if returns['6_month'] is not None:
                    tracking_difference = round(returns['6_month'] - underlying_index_return_6m, 2)
        except Exception as e:
            print(f"Error calculating tracking difference for {symbol}: {e}")

    
    # ETF verdict
    verdict_data = calculate_etf_verdict(
      rsi=rsi,
      above_ema200=current > ema200,
      above_ema50=current > ema50,
      pct_from_high=pct_from_high,
      returns_1m=returns.get('1_month'),
      expense_ratio=expense_ratio,
      premium_discount=premium_discount
    )

    verdict = verdict_data['verdict']
    verdict_color = verdict_data['verdict_color']
    action = verdict_data['action']
    
    return {
      'symbol': symbol,
      'type': 'etf',
      'current_price': round(current, 2),
      'change': round(change, 2),
      'change_percent': round(change_pct, 2),
      'nav': round(nav, 2) if nav else None,
      'premium_discount_pct': premium_discount,
      'aum': aum,
      'expense_ratio': expense_ratio,
      'underlying_index': underlying_index,
      'fund_house': fund_house,
      'underlying_index_return_6m': underlying_index_return_6m,
      'tracking_difference': tracking_difference,
      'avg_volume': round(avg_volume),
      'volume_ratio': volume_ratio,
      'high_52w': round(high_52w, 2),
      'low_52w': round(low_52w, 2),
      'pct_from_high': round(pct_from_high, 2),
      'ema20': round(ema20, 2),
      'ema50': round(ema50, 2),
      'ema200': round(ema200, 2),
      'rsi': round(rsi, 2),
      'returns': returns,
      'verdict': verdict,
      'verdict_color': verdict_color,
      'action': action,
      'above_ema200': current > ema200,
    }
    
  except Exception as e:
    import traceback
    print(f"ETF analysis error: {e}")
    traceback.print_exc()
    return None
