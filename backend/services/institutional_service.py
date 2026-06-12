import requests
import pandas as pd
import yfinance as yf
from bs4 import BeautifulSoup
import time
from typing import Optional, Dict

HEADERS = {
  'User-Agent': (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/120.0.0.0 Safari/537.36'
  ),
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.nseindia.com/',
}

_nse_session = None
_nse_session_time = 0

def get_nse_session():
  global _nse_session, _nse_session_time
  import time
  
  now = time.time()
  if _nse_session and (now - _nse_session_time < 300):
    return _nse_session
  
  print("🔄 Creating new NSE session...")
  import requests
  session = requests.Session()
  
  try:
    session.get(
      'https://www.nseindia.com',
      headers=HEADERS, timeout=15
    )
    time.sleep(1)
    session.get(
      'https://www.nseindia.com/market-data/live-equity-market',
      headers=HEADERS, timeout=15
    )
    print(f"✅ NSE session ready. "
          f"Cookies: {list(session.cookies.keys())}")
    _nse_session = session
    _nse_session_time = now
  except Exception as e:
    print(f"❌ NSE session error: {e}")
  
  return session

_institutional_cache: Dict = {}
CACHE_TIMEOUT = 21600  # 6 hours

def get_institutional_data(symbol: str, refresh: bool = False) -> dict:
  cache_key = symbol
  now = time.time()
  
  if not refresh and cache_key in _institutional_cache:
    data, ts = _institutional_cache[cache_key]
    if now - ts < CACHE_TIMEOUT:
      return data
  
  clean = symbol.replace('.NS','').replace('.BO','')
  
  result = {
    'symbol': symbol,
    'fii_dii_trend': get_fii_dii_trend(symbol),
    'bulk_deals': get_bulk_deals(clean),
    'block_deals': get_block_deals(clean),
    'promoter_activity': get_promoter_activity(symbol),
    'smart_money_score': 0,
    'institutional_verdict': '',
  }
  
  # Calculate Smart Money Score
  result['smart_money_score'] = calculate_smart_money_score(result)
  result['institutional_verdict'] = get_institutional_verdict(result)
  
  _institutional_cache[cache_key] = (result, now)
  return result


def get_fii_dii_trend(symbol: str) -> dict:
  try:
    ticker = yf.Ticker(symbol)
    info = ticker.info
    
    # Get institutional holders
    institutional = ticker.institutional_holders
    major_holders = ticker.major_holders
    
    result = {
      'fii_holding_pct': None,
      'dii_holding_pct': None,
      'promoter_pct': None,
      'public_pct': None,
      'quarterly_trend': []
    }
    
    if major_holders is not None and not major_holders.empty:
      for idx, row in major_holders.iterrows():
        try:
          val = str(row.iloc[0]).replace('%','').strip()
          label = str(row.iloc[1]).lower() if len(row) > 1 else ''
        except IndexError:
          continue
        try:
          pct = float(val)
          if 'institution' in label:
            result['fii_holding_pct'] = pct
          elif 'insider' in label or 'promoter' in label:
            result['promoter_pct'] = pct
        except:
          pass
    
    return result
    
  except Exception as e:
    print(f"FII/DII trend error: {e}")
    return {}


def get_bulk_deals(symbol: str) -> list:
  import requests
  import csv
  import io
  
  deals = []
  clean = symbol.replace('.NS','').replace('.BO','')
  
  try:
    # NSE CSV endpoint - more reliable than API
    url = (
      "https://nsearchives.nseindia.com/content/"
      "equities/bulk.csv"
    )
    
    session = requests.Session()
    session.get(
      'https://www.nseindia.com',
      headers=HEADERS,
      timeout=10
    )
    
    r = session.get(
      url,
      headers=HEADERS,
      timeout=15
    )
    
    print(f"📡 Bulk CSV status: {r.status_code}")
    
    if r.status_code == 200:
      content = r.content.decode('utf-8', errors='ignore')
      reader = csv.DictReader(io.StringIO(content))
      
      for row in reader:
        # Match by symbol
        row_symbol = row.get('Symbol','').strip().upper()
        if row_symbol == clean.upper():
          try:
            qty = float(str(row.get(
              'Quantity Traded',0
            )).replace(',',''))
            price = float(str(row.get(
              'Trade Price / Wght Avg Price',0
            )).replace(',',''))
            deals.append({
              'date': row.get('Date',''),
              'client': row.get('Client Name',''),
              'buy_sell': row.get('Buy/Sell',''),
              'quantity': int(qty),
              'price': price,
              'value_cr': round(qty * price / 1e7, 2)
            })
          except Exception as e:
            continue
      
      print(f"📦 Found {len(deals)} bulk deals for {clean}")
    
  except Exception as e:
    print(f"❌ Bulk CSV error: {e}")
  
  return deals


def get_bulk_deals_screener(symbol: str) -> list:
  deals = []
  try:
    url = f"https://www.screener.in/company/{symbol}/"
    session = requests.Session()
    resp = session.get(url, headers=HEADERS, timeout=10)
    
    if resp.status_code != 200:
      return deals
    
    soup = BeautifulSoup(resp.text, 'lxml')
    
    # Find bulk deals section
    bulk_section = soup.find(
      'section',
      id='bulk-deals'
    )
    if not bulk_section:
      return deals
    
    table = bulk_section.find('table')
    if not table:
      return deals
    
    rows = table.find_all('tr')[1:]
    for row in rows[:8]:
      cells = row.find_all('td')
      if len(cells) >= 5:
        deals.append({
          'date': cells[0].text.strip(),
          'client': cells[1].text.strip(),
          'buy_sell': cells[2].text.strip(),
          'quantity': cells[3].text.strip()
                       .replace(',', ''),
          'price': cells[4].text.strip()
                   .replace(',', ''),
        })
  
  except Exception as e:
    print(f"Screener bulk deals error: {e}")
  
  return deals


def get_block_deals(symbol: str) -> list:
  import requests
  import csv
  import io
  
  deals = []
  clean = symbol.replace('.NS','').replace('.BO','')
  
  try:
    url = (
      "https://nsearchives.nseindia.com/content/"
      "equities/block.csv"
    )
    
    session = requests.Session()
    session.get(
      'https://www.nseindia.com',
      headers=HEADERS,
      timeout=10
    )
    
    r = session.get(
      url,
      headers=HEADERS,
      timeout=15
    )
    
    print(f"📡 Block CSV status: {r.status_code}")
    
    if r.status_code == 200:
      content = r.content.decode('utf-8', errors='ignore')
      reader = csv.DictReader(io.StringIO(content))
      
      for row in reader:
        row_symbol = row.get('Symbol','').strip().upper()
        if row_symbol == clean.upper():
          try:
            qty = float(str(row.get(
              'Quantity Traded',0
            )).replace(',',''))
            price = float(str(row.get(
              'Trade Price / Wght Avg Price',0
            )).replace(',',''))
            deals.append({
              'date': row.get('Date',''),
              'client': row.get('Client Name',''),
              'buy_sell': row.get('Buy/Sell',''),
              'quantity': int(qty),
              'price': price,
              'value_cr': round(qty * price / 1e7, 2)
            })
          except:
            continue
      
      print(f"📦 Found {len(deals)} block deals for {clean}")
    
  except Exception as e:
    print(f"❌ Block CSV error: {e}")
  
  return deals


def get_promoter_activity(symbol: str) -> dict:
  import requests
  from bs4 import BeautifulSoup
  
  activity = {
    'trend': 'Stable',
    'promoter_values': [],
    'latest_holding': None,
    'change_vs_last_quarter': None,
    'recent_buying': [],
    'recent_selling': []
  }
  
  clean = symbol.replace('.NS','').replace('.BO','')
  
  try:
    session = requests.Session()
    
    url = f"https://www.screener.in/company/{clean}/"
    r = session.get(url, headers=HEADERS, timeout=15)
    
    if r.status_code != 200:
      print(f"⚠️ Screener {r.status_code} for {clean}")
      return activity
    
    soup = BeautifulSoup(r.text, 'html.parser')
    
    sh_section = None
    for s in soup.find_all('section'):
      h = s.find(['h2','h3'])
      if h and 'shareholding' in h.text.lower():
        sh_section = s
        break
    
    if not sh_section:
      print("⚠️ No shareholding section")
      return activity
    
    table = sh_section.find('table')
    if not table:
      return activity
    
    promoter_values = []
    all_rows = table.find_all('tr')
    
    for row in all_rows:
      cells = row.find_all(['td','th'])
      if not cells:
        continue
      label = cells[0].text.strip().lower()
      
      # Match promoter row — skip pledge/FII/DII rows
      if ('promoter' in label and 
          'pledge' not in label and
          'fii' not in label and
          'dii' not in label and
          'public' not in label and
          'foreign' not in label):
        
        print(f"📋 Found row: {label}")
        print(f"📋 All cells: {[c.text.strip() for c in cells]}")
        
        # Collect all non-empty numeric values
        raw_values = []
        for cell in cells[1:8]:
          # Clean special characters including
          # non-breaking spaces and + signs
          txt = cell.text.strip()
          txt = txt.replace('\xa0', '')
          txt = txt.replace('%', '')
          txt = txt.replace(',', '')
          txt = txt.replace('+', '')
          txt = txt.replace('-', '')
          txt = txt.strip()
          
          if txt and txt != '':
            try:
              val = float(txt)
              if val > 0:
                raw_values.append(val)
            except:
              pass
        
        # If only one unique value found,
        # fill quarters with same value
        # (stable holding across quarters)
        if len(raw_values) == 1:
          raw_values = raw_values * 4
          print(f"⚠️ Only 1 value found, "
                f"duplicating for stable display")
        
        print(f"📊 Raw promoter values: {raw_values}")
        
        if raw_values:
          promoter_values = raw_values[:4]
        break
    
    print(f"📊 Promoter values: {promoter_values}")
    
    if len(promoter_values) >= 2:
      # promoter_values[0] = most recent quarter
      latest = promoter_values[0]
      prev = promoter_values[1]
      change = round(latest - prev, 2)
      
      # Store in chronological order for bar chart
      # (oldest first, latest last)
      activity['promoter_values'] = list(
        reversed(promoter_values[:4])
      )
      activity['latest_holding'] = latest
      activity['change_vs_last_quarter'] = change
      
      if change > 0.3:
        activity['trend'] = 'Increasing'
        activity['recent_buying'].append({
          'change': f"+{change}%",
          'note': 'Promoter increased stake'
        })
      elif change < -0.3:
        activity['trend'] = 'Decreasing'
        activity['recent_selling'].append({
          'change': f"{change}%",
          'note': 'Promoter decreased stake'
        })
      
      print(f"✅ Promoter: {latest}% "
            f"(change: {change:+.2f}%)")
  
  except Exception as e:
    print(f"❌ Promoter error: {e}")
  
  return activity


def calculate_smart_money_score(data: dict) -> int:
  score = 50
  
  bulk = data.get('bulk_deals', [])
  if bulk:
    buys = sum(1 for d in bulk
      if 'buy' in str(d.get('buy_sell','')).lower())
    sells = sum(1 for d in bulk
      if 'sell' in str(d.get('buy_sell','')).lower())
    if buys > sells:
      score += 15
    elif sells > buys:
      score -= 15
  
  block = data.get('block_deals', [])
  if block:
    buy_blocks = sum(1 for d in block
      if 'buy' in str(d.get('buy_sell','')).lower())
    if buy_blocks > 0:
      score += 10
  
  promoter = data.get('promoter_activity', {})
  trend = promoter.get('trend', 'Stable')
  change = promoter.get('change_vs_last_quarter', 0) or 0
  latest = promoter.get('latest_holding')
  
  if trend == 'Increasing':
    score += 20 if change > 1 else 12
  elif trend == 'Decreasing':
    score -= 15 if change < -1 else 8
  
  if latest:
    if latest > 60:
      score += 5
    elif latest < 30:
      score -= 5
  
  return max(0, min(100, score))


def get_institutional_verdict(data: dict) -> str:
  score = data.get('smart_money_score', 50)
  promoter_trend = data.get(
    'promoter_activity', {}
  ).get('trend', 'Stable')
  
  bulk = data.get('bulk_deals', [])
  has_bulk_buying = any(
    'buy' in str(d.get('buy_sell','')).lower()
    for d in bulk[:3]
  )
  
  if score >= 70 and promoter_trend == 'Increasing':
    return 'Strong Institutional Accumulation'
  elif score >= 65 or has_bulk_buying:
    return 'Institutional Buying Detected'
  elif score >= 50:
    return 'Neutral — No significant activity'
  elif score < 40 and promoter_trend == 'Decreasing':
    return 'Institutional Selling — Caution'
  else:
    return 'Mild Selling Pressure'
