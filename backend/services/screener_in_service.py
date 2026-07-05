import requests
import time
import json
from bs4 import BeautifulSoup
from typing import Optional, Dict

# Headers to mimic a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
}

_fundamental_cache = {}
_FUND_CACHE_TTL = 21600  # 6 hours

_last_screener_request = 0
SCREENER_REQUEST_DELAY = 2  # seconds between requests


def get_screener_symbol(nse_symbol: str) -> str:
  print(f"[DEBUG] Original symbol: {nse_symbol}")
  # Convert HDFCBANK.NS → HDFCBANK
  clean_sym = nse_symbol.replace('.NS', '').replace('.BO', '')
  print(f"[DEBUG] Transformed symbol: {clean_sym}")
  print(f"[DEBUG] Strip check: {nse_symbol} -> {clean_sym}")
  return clean_sym


def scrape_with_rate_limit(symbol: str) -> Optional[dict]:
  global _last_screener_request
  
  now = time.time()
  time_since_last = now - _last_screener_request
  
  if time_since_last < SCREENER_REQUEST_DELAY:
    time.sleep(SCREENER_REQUEST_DELAY - time_since_last)
  
  _last_screener_request = time.time()
  return scrape_screener_fundamentals(symbol)


def parse_number(val):
  if not val:
    return None
  val = str(val).replace(',', '').strip()
  val = val.replace('%', '').replace('₹', '')
  val = val.replace('Cr', '').replace('cr', '').strip()
  try:
    return float(val)
  except:
    return None

def parse_top_ratios(soup):
  ratios = {}
  
  top_section = soup.find(id='top-ratios')
  if top_section:
    all_li = top_section.find_all('li')
    for li in all_li:
      all_spans = li.find_all('span')
      if len(all_spans) >= 2:
        key = all_spans[0].text.strip()
        val = all_spans[-1].text.strip()
        if key and val and key != val:
          ratios[key] = val
  
  print(f"[INFO] Ratio keys found: {list(ratios.keys())}")
  print(f"[DEBUG] Debt key search: "
        f"D/E={ratios.get('Debt to equity')} "
        f"OPM={ratios.get('OPM')}")
  
  if not ratios:
    print(f"[WARN] No ratios found — checking if page loaded correctly")
    all_lis = soup.find_all('li', class_=lambda x: x and 'flex' in x)
    print(f"[DEBUG] Found {len(all_lis)} ratio li elements")
    for li in all_lis[:5]:
        print(f"[DEBUG] li text: {li.get_text(strip=True)[:50]}")

  def parse_number(val):
    if not val: return None
    val = str(val).replace(',','').replace('%','')
    val = val.replace('₹','').replace('Cr','').strip()
    try: return float(val)
    except: return None
  
  res = {
    'market_cap': parse_number(
      ratios.get('Market Cap') or 
      ratios.get('Mkt Cap')
    ),
    'pe_ratio': parse_number(
      ratios.get('Stock P/E') or 
      ratios.get('P/E')
    ),
    'pb_ratio': parse_number(
      ratios.get('Price to Book') or 
      ratios.get('P/B')
    ),
    'roce': parse_number(ratios.get('ROCE')),
    'roe': parse_number(ratios.get('ROE')),
    'dividend_yield': parse_number(
      ratios.get('Dividend Yield') or ratios.get('Div. Yield')
    ),
    'eps': parse_number(
      ratios.get('EPS in Rs') or 
      ratios.get('EPS')
    ),
    'book_value': parse_number(
      ratios.get('Book Value')
    ),
    'face_value': parse_number(
      ratios.get('Face Value')
    ),
    'debt_to_equity': parse_number(
      ratios.get('Debt to equity') or
      ratios.get('Debt / Equity') or
      ratios.get('D/E Ratio') or
      ratios.get('Debt to Equity')
    ),
    'interest_coverage': parse_number(
      ratios.get('Interest Coverage')
    ),
    'op_margin': parse_number(
      ratios.get('OPM') or
      ratios.get('Operating Profit Margin') or
      ratios.get('Op. Profit Margin') or
      ratios.get('Oper. Profit Margin')
    ),
    'nim': parse_number(ratios.get('NIM')),
    'gross_npa': parse_number(ratios.get('Gross NPA') or ratios.get('GNPA %')),
    'net_npa': parse_number(ratios.get('Net NPA') or ratios.get('NNPA %')),
    'car': parse_number(ratios.get('CAR')),
    'ps_ratio': parse_number(
      ratios.get('Price to Sales') or 
      ratios.get('P/S') or
      ratios.get('Price/Sales')
    ),
    'ev_ebitda': parse_number(
      ratios.get('EV/EBITDA') or 
      ratios.get('EV / EBITDA')
    ),
  }
  
  high_low = ratios.get('High / Low')
  if high_low and '/' in str(high_low):
    try:
      parts = str(high_low).split('/')
      high_52w = parse_number(parts[0])
      low_52w = parse_number(parts[1])
      if high_52w is not None and low_52w is not None:
        res['high_52w'] = high_52w
        res['low_52w'] = low_52w
        res['avg_52w'] = round((high_52w + low_52w) / 2, 2)
    except Exception:
      pass
      
  return res

# Hardcoded peer overrides for stocks where
# Screener.in sector classification is wrong
PEER_OVERRIDES = {
  'HDFCBANK': [
    {'symbol': 'ICICIBANK', 'name': 'ICICI Bank'},
    {'symbol': 'KOTAKBANK', 'name': 'Kotak Mahindra Bank'},
    {'symbol': 'AXISBANK', 'name': 'Axis Bank'},
    {'symbol': 'SBIN', 'name': 'State Bank of India'},
    {'symbol': 'INDUSINDBK', 'name': 'IndusInd Bank'},
  ],
  'ICICIBANK': [
    {'symbol': 'HDFCBANK', 'name': 'HDFC Bank'},
    {'symbol': 'KOTAKBANK', 'name': 'Kotak Mahindra Bank'},
    {'symbol': 'AXISBANK', 'name': 'Axis Bank'},
    {'symbol': 'SBIN', 'name': 'State Bank of India'},
    {'symbol': 'INDUSINDBK', 'name': 'IndusInd Bank'},
  ],
  'KOTAKBANK': [
    {'symbol': 'HDFCBANK', 'name': 'HDFC Bank'},
    {'symbol': 'ICICIBANK', 'name': 'ICICI Bank'},
    {'symbol': 'AXISBANK', 'name': 'Axis Bank'},
    {'symbol': 'SBIN', 'name': 'State Bank of India'},
    {'symbol': 'INDUSINDBK', 'name': 'IndusInd Bank'},
  ],
  'RELIANCE': [
    {'symbol': 'ONGC', 'name': 'ONGC'},
    {'symbol': 'IOC', 'name': 'Indian Oil Corp'},
    {'symbol': 'BPCL', 'name': 'BPCL'},
    {'symbol': 'GAIL', 'name': 'GAIL India'},
    {'symbol': 'HINDPETRO', 'name': 'HPCL'},
  ],
  'TCS': [
    {'symbol': 'INFY', 'name': 'Infosys'},
    {'symbol': 'WIPRO', 'name': 'Wipro'},
    {'symbol': 'HCLTECH', 'name': 'HCL Technologies'},
    {'symbol': 'TECHM', 'name': 'Tech Mahindra'},
    {'symbol': 'LTIM', 'name': 'LTIMindtree'},
  ],
  'INFY': [
    {'symbol': 'TCS', 'name': 'TCS'},
    {'symbol': 'WIPRO', 'name': 'Wipro'},
    {'symbol': 'HCLTECH', 'name': 'HCL Technologies'},
    {'symbol': 'TECHM', 'name': 'Tech Mahindra'},
    {'symbol': 'LTIM', 'name': 'LTIMindtree'},
  ],
  'WIPRO': [
    {'symbol': 'TCS', 'name': 'TCS'},
    {'symbol': 'INFY', 'name': 'Infosys'},
    {'symbol': 'HCLTECH', 'name': 'HCL Technologies'},
    {'symbol': 'TECHM', 'name': 'Tech Mahindra'},
    {'symbol': 'LTIM', 'name': 'LTIMindtree'},
  ],
  'HINDUNILVR': [
    {'symbol': 'ITC', 'name': 'ITC'},
    {'symbol': 'NESTLEIND', 'name': 'Nestle India'},
    {'symbol': 'DABUR', 'name': 'Dabur India'},
    {'symbol': 'MARICO', 'name': 'Marico'},
    {'symbol': 'GODREJCP', 'name': 'Godrej Consumer'},
  ],
  'ADANIENT': [
    {'symbol': 'ADANIPORTS', 'name': 'Adani Ports'},
    {'symbol': 'ADANIPOWER', 'name': 'Adani Power'},
    {'symbol': 'ADANIGREEN', 'name': 'Adani Green'},
    {'symbol': 'ADANITRANS', 'name': 'Adani Transmission'},
    {'symbol': 'ADANIGAS', 'name': 'Adani Total Gas'},
  ],
}


def parse_peers(soup, symbol, is_api=False):
  peers = []
  
  # Check for hardcoded override first
  clean_self = symbol.replace('.NS','').replace('.BO','').upper()
  if clean_self in PEER_OVERRIDES:
    print(f"✅ Using peer override for {clean_self}")
    override_peers = PEER_OVERRIDES[clean_self]
    
    # Fetch basic data for each override peer
    for p in override_peers:
      try:
        import yfinance as yf
        # Use .NS suffix, never $ prefix
        clean_sym = p['symbol'].replace(
          '$', ''
        ).replace('.NS', '').replace('.BO', '')
        ticker = yf.Ticker(f"{clean_sym}.NS")
        
        # Suppress yfinance errors for peers
        import logging
        yf_logger = logging.getLogger('yfinance')
        yf_logger.setLevel(logging.CRITICAL)
        
        info = ticker.fast_info
        
        peers.append({
          'name': p['name'],
          'symbol': clean_sym,
          'price': round(
            getattr(info, 'last_price', 0) or 0, 2
          ),
          'pe_ratio': round(
            info.get('trailingPE', 0) 
            if hasattr(info, 'get') 
            else 0, 1
          ),
          'market_cap': round(
            getattr(info, 'market_cap', 0) / 1e7, 0
          ),
          'roce': None,
          'net_profit_qtr': None,
          'sales_qtr': None,
        })
        print(f"  ✅ {p['name']}: "
              f"₹{getattr(info,'last_price','N/A')}")
      except Exception as e:
        print(f"  ⚠️ {p['name']} fetch error: {e}")
        peers.append({
          'name': p['name'],
          'symbol': p['symbol'],
          'price': None,
          'pe_ratio': None,
          'market_cap': None,
          'roce': None,
        })
    
    return peers
  
  if is_api:
    table = soup.find('table')
  else:
    peer_section = soup.find('section', id='peers')
    if not peer_section:
      print("❌ peers section not found")
      return peers
    table = peer_section.find('table')

  if not table:
    print("❌ peers table not found")
    return peers
  
  # Print raw table HTML for debugging
  print(f"Peers table HTML preview:")
  print(str(table)[:800])
  
  thead = table.find('thead')
  headers = []
  if thead:
    ths = thead.find_all('th')
    headers = [th.text.strip() for th in ths]
    print(f"Peer headers: {headers}")
  
  tbody = table.find('tbody')
  rows = tbody.find_all('tr') if tbody else table.find_all('tr')[1:]
  print(f"Peer rows found: {len(rows)}")
  
  for i, row in enumerate(rows[:8]):
    cells = row.find_all('td')
    print(f"Row {i}: {len(cells)} cells")
    for j, cell in enumerate(cells[:4]):
      print(f"  Cell {j}: '{cell.text.strip()}'")
  
  # Parse each cell by position not by header
  for row in rows[:8]:
    cells = row.find_all('td')
    if len(cells) < 4:
      continue
    
    peer = {}
    
    # Cell 1: Company name
    name_cell = cells[1]
    link = name_cell.find('a')
    if link:
      peer['name'] = link.text.strip()
      href = link.get('href', '')
      # Extract symbol: /company/ONGC/ -> ONGC
      # Handle /company/ONGC/consolidated/ -> ONGC
      parts = [p for p in href.split('/') if p]
      if parts:
        if parts[-1].lower() == 'consolidated' and len(parts) >= 2:
          peer['symbol'] = parts[-2]
        else:
          peer['symbol'] = parts[-1]
      else:
        peer['symbol'] = ''
    else:
      peer['name'] = name_cell.text.strip()
    
    if not peer.get('name') or peer['name'] == 'S.No.':
      continue
    
    # Skip the company itself
    clean_self = symbol.replace('.NS','').replace('.BO','')
    if peer.get('symbol','').upper() == clean_self.upper():
      continue
      
    def safe_num(text):
      try:
        return float(text.replace(',','').replace('%','').strip())
      except:
        return None
    
    # Parse remaining cells by position
    if len(cells) > 2:
      peer['price'] = safe_num(cells[2].text)
    if len(cells) > 3:
      peer['pe_ratio'] = safe_num(cells[3].text)
    if len(cells) > 4:
      peer['market_cap'] = safe_num(cells[4].text)
    if len(cells) > 5:
      peer['dividend_yield'] = safe_num(cells[5].text)
    if len(cells) > 6:
      peer['net_profit_qtr'] = safe_num(cells[6].text)
    # usually 7 is Qtr Profit Var, 8 is Sales Qtr, 9 is Qtr Sales Var, 10 is ROCE
    if len(cells) > 8:
      peer['sales_qtr'] = safe_num(cells[8].text)
    if len(cells) > 10:
      peer['roce'] = safe_num(cells[10].text)
    
    print(f"Peer parsed: {peer['name']} | "
          f"PE: {peer.get('pe_ratio')} | "
          f"ROCE: {peer.get('roce')}")
    
    peers.append(peer)

  return peers

def parse_quarterly_results(soup):
  quarterly = {}
  q_section = soup.find('section', id='quarters')
  
  if not q_section:
    return quarterly
  
  q_table = q_section.find('table')
  if not q_table:
    return quarterly
  
  # Get headers (quarter names)
  thead = q_table.find('thead')
  if thead:
    header_cells = thead.find_all('th')
    # Skip first cell (label column)
    # Take last 4 quarters (rightmost = most recent)
    all_quarters = [th.text.strip() for th in header_cells[1:]]
    # IMPORTANT: Screener.in has latest on RIGHT
    # Take last 4 for most recent quarters
    recent_quarters = all_quarters[-4:] if len(all_quarters) >= 4 else all_quarters
    quarterly['quarters'] = recent_quarters
    print(f"All quarters: {all_quarters}")
    print(f"Using recent: {recent_quarters}")
  
  # Parse data rows
  tbody = q_table.find('tbody')
  if not tbody:
    tbody = q_table
  
  rows = tbody.find_all('tr')
  
  def parse_row_values(cells, num_quarters=4):
    # Get all values, take last N (most recent)
    all_values = []
    for cell in cells[1:]:  # Skip label
      text = cell.text.strip().replace(',', '').replace('%', '')
      try:
        all_values.append(float(text))
      except:
        all_values.append(None)
    # Return last N values (most recent)
    return all_values[-num_quarters:] if len(all_values) >= num_quarters else all_values
  
  n = len(recent_quarters)
  
  for row in rows:
    cells = row.find_all(['td', 'th'])
    if not cells:
      continue
    
    label = cells[0].text.strip()
    print(f"Quarterly row: '{label}'")
    values = parse_row_values(cells, n)
    
    if any(x in label for x in [
      'Sales', 'Revenue', 'Net Sales', 'Revenue +', 'Interest Earned', 'Total Income', 'Net Interest Income'
    ]):
      quarterly['revenue'] = values
    
    elif any(x in label for x in [
      'Operating Profit', 'EBITDA'
    ]) and 'Margin' not in label and '%' not in label:
      quarterly['operating_profit'] = values
    
    elif any(x in label for x in [
      'OPM %', 'OPM%', 'Operating Profit Margin',
      'OPM', 'EBITDA Margin'
    ]):
      quarterly['opm_percent'] = values
      print(f"Found OPM%: {values}")
    
    elif any(x in label for x in [
      'Net Profit', 'Profit after tax', 
      'PAT', 'Net profit', 'Profit After Tax'
    ]):
      quarterly['net_profit'] = values
    
    elif label == 'EPS' or label == 'EPS in Rs':
      quarterly['eps'] = values
    
    elif any(x in label for x in [
      'Expenses', 'Total Expenses'
    ]):
      quarterly['expenses'] = values
  
  return quarterly

def parse_annual_results(soup):
  annual = {}
  
  a_section = soup.find('section', id='profit-loss')
  if not a_section:
    print("profit-loss section not found")
    return annual
  
  a_table = a_section.find('table')
  if not a_table:
    return annual
  
  rows = a_table.find_all('tr')
  
  def parse_row(cells):
    values = []
    for cell in cells[1:]:
      text = cell.text.strip().replace(',', '').replace('%', '')
      try:
        values.append(float(text))
      except:
        values.append(None)
    return values
  
  for row in rows:
    cells = row.find_all(['td', 'th'])
    if not cells:
      continue
    
    label = cells[0].text.strip()
    print(f"Annual row label: '{label}'")
    
    values = parse_row(cells)
    
    if any(x in label for x in [
      'Sales', 'Revenue', 'Net Sales', 
      'Total Revenue', 'Revenue from Operations',
      'Revenue +', 'Interest Earned', 'Total Income', 'Net Interest Income'
    ]):
      annual['revenue'] = values
      print(f"Found revenue: {values[-3:]}")
    
    # Net profit - try all labels
    elif any(x in label for x in [
      'Net Profit', 'Profit after tax',
      'PAT', 'Net profit'
    ]):
      annual['net_profit'] = values
    
    # OPM
    elif 'OPM' in label or 'Operating Profit Margin' in label:
      annual['opm'] = values
  
  # Calculate YoY growth from revenue
  if annual.get('revenue'):
    rev = [v for v in annual['revenue'] if v is not None]
    if len(rev) >= 2:
      curr = rev[-1]
      prev = rev[-2]
      if prev and prev != 0:
        annual['revenue_growth_yoy'] = round(
          ((curr - prev) / abs(prev)) * 100, 2
        )
        print(f"Revenue growth YoY: {annual['revenue_growth_yoy']}%")
  
  return annual

def scrape_screener_fundamentals(symbol: str) -> Optional[dict]:
  cache_key = symbol
  now = time.time()
  if cache_key in _fundamental_cache:
      data, ts = _fundamental_cache[cache_key]
      if now - ts < _FUND_CACHE_TTL:
          print(f"[CACHE HIT] Fundamentals for {symbol}")
          return data
  
  clean_symbol = get_screener_symbol(symbol)
  
  print(f"[DEBUG] Scraping Screener.in for {clean_symbol}...")
  
  urls_to_try = [
      f"https://www.screener.in/company/{clean_symbol}/consolidated/",
      f"https://www.screener.in/company/{clean_symbol}/",
  ]
  
  soup = None
  try:
    for url in urls_to_try:
        print(f"[DEBUG] Trying URL: {url}")
        try:
            response = requests.get(url, headers=HEADERS, timeout=15)
            if response.status_code == 200:
                temp_soup = BeautifulSoup(response.text, 'lxml')
                # Check if ratio section has actual data
                ratio_section = temp_soup.find(id='top-ratios')
                if ratio_section:
                    ratio_items = ratio_section.find_all('li')
                    if len(ratio_items) > 3:
                        print(f"[DEBUG] Found data at: {url}")
                        soup = temp_soup
                        break
                    else:
                        print(f"[DEBUG] No ratio data at {url}, trying next")
        except Exception as e:
            print(f"[DEBUG] Failed {url}: {e}")
            continue

    if not soup:
      print(f"[ERROR] Screener.in failed to find data for {clean_symbol}")
      return None
    
    data = {}
    
    # --- COMPANY INFO ---
    try:
      name_tag = soup.find('h1', class_='margin-0')
      data['company_name'] = name_tag.text.strip() if name_tag else clean_symbol
    except:
      data['company_name'] = clean_symbol
    
    # --- KEY RATIOS (the top ratio boxes) ---
    try:
      ratio_data = parse_top_ratios(soup)
      data.update(ratio_data)
      
    except Exception as e:
      print(f"Ratio parsing error: {e}")
    
    # --- ABOUT SECTION ---
    try:
      about = soup.find('div', class_='about')
      if about:
        data['about'] = about.text.strip()[:500]
    except:
      pass
    
    # --- PEER COMPARISON ---
    try:
      company_div = soup.find(attrs={'data-company-id': True})
      if company_div:
        company_id = company_div['data-company-id']
        peers_url = f"https://www.screener.in/api/company/{company_id}/peers/"
        peers_resp = requests.get(peers_url, headers=HEADERS, timeout=15)
        if peers_resp.status_code == 200:
          peers_soup = BeautifulSoup(peers_resp.text, 'lxml')
          data['peers'] = parse_peers(peers_soup, symbol, is_api=True)
        else:
          data['peers'] = parse_peers(soup, symbol, is_api=False)
      else:
        data['peers'] = parse_peers(soup, symbol, is_api=False)
    except Exception as e:
      print(f"Peers parsing error: {e}")
      data['peers'] = []
    
    # --- SHAREHOLDING PATTERN ---
    try:
      shareholding = {}
      sh_section = soup.find('section', id='shareholding')
      if sh_section:
        sh_table = sh_section.find('table')
        if sh_table:
          rows = sh_table.find_all('tr')
          if rows:
            # Get latest quarter (first data column)
            for row in rows:
              cols = row.find_all('td')
              if len(cols) >= 2:
                label = row.find('td').text.strip()
                value = cols[1].text.strip() if len(cols) > 1 else ''
                
                if 'Promoters' in label:
                  shareholding['promoter_holding'] = parse_number(value)
                elif 'FPI' in label or 'Foreign Portfolio' in label:
                  shareholding['fpi_holding'] = parse_number(value)
                elif 'FIIs' in label or 'Foreign' in label:
                  shareholding['fii_holding'] = parse_number(value)
                elif 'DIIs' in label or 'Domestic' in label:
                  shareholding['dii_holding'] = parse_number(value)
                elif 'Public' in label:
                  shareholding['public_holding'] = parse_number(value)
      
      data['shareholding'] = shareholding
      data['promoter_holding'] = shareholding.get('promoter_holding')
      
      if data['promoter_holding'] is not None:
          data['free_float'] = round(100 - data['promoter_holding'], 2)
      else:
          data['free_float'] = None
          
      fpi_val = shareholding.get('fpi_holding') or shareholding.get('fii_holding')
      data['fpi_holding'] = fpi_val
      
      data['fii_holding'] = shareholding.get('fii_holding')
      data['dii_holding'] = shareholding.get('dii_holding')
      
    except Exception as e:
      print(f"Shareholding parsing error: {e}")
      data['shareholding'] = {}
    
    # --- PROMOTER PLEDGE ---
    try:
      pledge = None
      pledge_section = soup.find(
        'span', 
        string=lambda t: t and 'Pledged' in t
      )
      if pledge_section:
        pledge_value = pledge_section.find_next('td')
        if pledge_value:
          pledge = parse_number(pledge_value.text.strip())
      data['promoter_pledge'] = pledge
    except:
      data['promoter_pledge'] = None
    
    # --- QUARTERLY RESULTS ---
    try:
      quarterly = parse_quarterly_results(soup)
      data['quarterly_results'] = quarterly
      
      # Calculate QoQ growth
      if quarterly.get('net_profit') and len(quarterly['net_profit']) >= 2:
        curr = quarterly['net_profit'][-1]
        prev = quarterly['net_profit'][-2]
        if curr and prev and prev != 0:
          data['profit_growth_qoq'] = round(
            ((curr - prev) / abs(prev)) * 100, 2
          )
      
    except Exception as e:
      print(f"Quarterly parsing error: {e}")
      data['quarterly_results'] = {}
    
    # --- ANNUAL RESULTS (10 years) ---
    try:
      annual = parse_annual_results(soup)
      data['annual_results'] = annual
      data['revenue_growth_yoy'] = annual.get('revenue_growth_yoy')
      
      if annual.get('net_profit') and len(annual['net_profit']) >= 2:
        curr = annual['net_profit'][-1]
        prev = annual['net_profit'][-2]
        if curr and prev and prev != 0:
          data['profit_growth_yoy'] = round(
            ((curr - prev) / abs(prev)) * 100, 2
          )
      
    except Exception as e:
      print(f"Annual parsing error: {e}")
    
    # --- BALANCE SHEET ---
    try:
      bs_section = soup.find('section', id='balance-sheet')
      if bs_section:
        bs_table = bs_section.find('table')
        if bs_table:
          rows = bs_table.find_all('tr')
          for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 2:
              label = cells[0].text.strip()
              latest = parse_number(cells[-1].text.strip())
              
              if 'Borrowings' in label:
                data['total_debt'] = latest
              elif 'Total Assets' in label:
                data['total_assets'] = latest
              elif 'Reserves' in label:
                data['reserves'] = latest
    except Exception as e:
      print(f"Balance sheet error: {e}")
    
    # --- CASH FLOW ---
    try:
      cf_section = soup.find('section', id='cash-flow')
      if cf_section:
        cf_table = cf_section.find('table')
        if cf_table:
          rows = cf_table.find_all('tr')
          for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 2:
              label = cells[0].text.strip()
              latest = parse_number(cells[-1].text.strip())
              
              if 'Operating' in label:
                data['cash_from_operations'] = latest
              elif 'Investing' in label:
                data['cash_from_investing'] = latest
              elif 'Financing' in label:
                data['cash_from_financing'] = latest
    except Exception as e:
      print(f"Cash flow error: {e}")
    
    # --- NEW METRICS ---
    if data.get('debt_to_equity') is None:
      if data.get('total_debt') is not None and data.get('reserves') and data.get('reserves') > 0:
        data['debt_to_equity'] = round(data['total_debt'] / data['reserves'], 2)
        
    quarterly = data.get('quarterly_results', {})
    
    data['net_margin'] = None
    if quarterly.get('net_profit') and quarterly.get('revenue'):
      np_latest = quarterly['net_profit'][-1]
      rev_latest = quarterly['revenue'][-1]
      if np_latest is not None and rev_latest and rev_latest > 0:
        data['net_margin'] = round((np_latest / rev_latest) * 100, 2)
        
    data['latest_opm'] = None
    if quarterly.get('opm_percent') and len(quarterly['opm_percent']) > 0:
      data['latest_opm'] = quarterly['opm_percent'][-1]
      
    data['roa'] = None
    if data.get('total_assets') and data['total_assets'] > 0:
      annual = data.get('annual_results', {})
      if annual.get('net_profit') and len(annual['net_profit']) > 0:
        np_annual = annual['net_profit'][-1]
        if np_annual is not None:
          data['roa'] = round((np_annual / data['total_assets']) * 100, 2)

    # --- EPS FALLBACK ---
    if not data.get('eps'):
      quarterly = data.get('quarterly_results', {})
      eps_list = quarterly.get('eps', [])
      if eps_list and eps_list[-1] is not None:
        data['eps'] = eps_list[-1]  # Latest quarter EPS
        print(f"[OK] EPS from quarterly: {data['eps']}")

    # --- PB RATIO FALLBACK ---
    if not data.get('pb_ratio'):
      import re
      page_text = soup.get_text()
      pb_patterns = [
        r'Price to Book\s*[\n\r]*\s*([\d.]+)',
        r'P/B\s*[\n\r]*\s*([\d.]+)',
        r'PB Ratio\s*[\n\r]*\s*([\d.]+)',
      ]
      for pattern in pb_patterns:
        match = re.search(pattern, page_text)
        if match:
          val = float(match.group(1))
          if 0.5 < val < 30:  # Sanity check
            data['pb_ratio'] = val
            print(f"[OK] PB Ratio found: {val}")
            break
            
      if not data.get('pb_ratio') and data.get('pe_ratio') and data.get('roe'):
        data['pb_ratio'] = round((data['pe_ratio'] * data['roe']) / 100, 2)
        print(f"[OK] PB Ratio calculated: {data['pb_ratio']}")
    
    # --- SCORING ---
    data['fundamental_score'] = calculate_fundamental_score(data)
    data['strengths'] = get_strengths(data)
    data['weaknesses'] = get_weaknesses(data)
    data['source'] = 'screener.in'
    data['symbol'] = symbol
    
    # Cache the result
    _fundamental_cache[cache_key] = (data, now)
    print(f"Screener.in data fetched for {clean_symbol}")
    
    return data
    
  except requests.Timeout:
    print(f"Screener.in timeout for {clean_symbol}")
    return None
  except Exception as e:
    print(f"Screener.in error for {clean_symbol}: {e}")
    return None

def clear_cache(symbol: str = None):
  global _fundamental_cache
  if symbol and symbol in _fundamental_cache:
    del _fundamental_cache[symbol]
  elif not symbol:
    _fundamental_cache = {}


def calculate_fundamental_score(data: dict) -> int:
  score = 50
  
  # Use whatever data we have
  roe = data.get('roe')
  roce = data.get('roce')  
  pe = data.get('pe_ratio')
  promoter = data.get('promoter_holding')
  pledge = data.get('promoter_pledge') or 0
  profit_growth = data.get('profit_growth_yoy')
  cash_ops = data.get('cash_from_operations')
  
  # Promoter holding scoring (we have this)
  if promoter:
    if promoter > 60: score += 15
    elif promoter > 40: score += 8
    elif promoter > 25: score += 3
    elif promoter < 25: score -= 10
  
  # Pledge scoring (we have this)  
  if pledge == 0: score += 10
  elif pledge < 5: score += 5
  elif pledge > 25: score -= 15
  elif pledge > 10: score -= 8
  
  # Cash flow scoring (we have this)
  if cash_ops and cash_ops > 0: score += 8
  elif cash_ops and cash_ops < 0: score -= 10
  
  # Profit growth (we have this)
  if profit_growth:
    if profit_growth > 20: score += 12
    elif profit_growth > 10: score += 6
    elif profit_growth > 0: score += 2
    elif profit_growth < 0: score -= 10
  
  # ROE if available
  if roe:
    if roe > 20: score += 10
    elif roe > 15: score += 5
    elif roe < 5: score -= 8
  
  # PE if available
  if pe:
    if 8 < pe < 20: score += 8
    elif 20 < pe < 35: score += 3
    elif pe > 60: score -= 8
    elif pe < 0: score -= 12
  
  return max(0, min(100, score))


def get_strengths(data: dict) -> list:
  strengths = []
  
  if data.get('roe') and data['roe'] > 15:
    strengths.append(f"Strong ROE of {data['roe']}%")
  if data.get('roce') and data['roce'] > 15:
    strengths.append(f"Good ROCE of {data['roce']}%")
  if data.get('promoter_holding') and data['promoter_holding'] > 50:
    strengths.append(f"High promoter holding {data['promoter_holding']}%")
  if not data.get('promoter_pledge') or data['promoter_pledge'] < 5:
    strengths.append("Low/zero promoter pledge")
  if data.get('revenue_growth_yoy') and data['revenue_growth_yoy'] > 10:
    strengths.append(f"Revenue growing {data['revenue_growth_yoy']}% YoY")
  if data.get('profit_growth_yoy') and data['profit_growth_yoy'] > 10:
    strengths.append(f"Profit growing {data['profit_growth_yoy']}% YoY")
  if data.get('cash_from_operations') and data['cash_from_operations'] > 0:
    strengths.append("Positive operating cash flow")
  
  return strengths[:5]


def get_weaknesses(data: dict) -> list:
  weaknesses = []
  
  if data.get('roe') and data['roe'] < 10:
    weaknesses.append(f"Low ROE of {data['roe']}%")
  if data.get('pe_ratio') and data['pe_ratio'] > 50:
    weaknesses.append(f"High PE of {data['pe_ratio']}x — expensive")
  if data.get('promoter_pledge') and data['promoter_pledge'] > 20:
    weaknesses.append(f"High promoter pledge {data['promoter_pledge']}%")
  if data.get('promoter_holding') and data['promoter_holding'] < 30:
    weaknesses.append(f"Low promoter holding {data['promoter_holding']}%")
  if data.get('revenue_growth_yoy') and data['revenue_growth_yoy'] < 0:
    weaknesses.append(f"Revenue declining {data['revenue_growth_yoy']}% YoY")
  if data.get('profit_growth_yoy') and data['profit_growth_yoy'] < 0:
    weaknesses.append(f"Profit declining {data['profit_growth_yoy']}% YoY")
  if data.get('total_debt') and data.get('reserves'):
    if data['total_debt'] > data['reserves'] * 2:
      weaknesses.append("High debt relative to reserves")
  
  return weaknesses[:5]
