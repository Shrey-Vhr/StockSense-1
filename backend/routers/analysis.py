from fastapi import APIRouter, HTTPException, BackgroundTasks
import asyncio
import math
import json

def fix_nan(obj):
  if isinstance(obj, float):
    if math.isnan(obj) or math.isinf(obj):
      return None
    return obj
  elif isinstance(obj, dict):
    return {k: fix_nan(v) for k, v in obj.items()}
  elif isinstance(obj, list):
    return [fix_nan(i) for i in obj]
  return obj

# Store scan results in memory
_scan_results = {}
_scan_status = {}
from services.technical_analysis import TechnicalAnalysisService

router = APIRouter()

@router.get("/technical/{symbol}")
async def get_technical_analysis(symbol: str):
    try:
        # Offload the heavy Pandas/TA-Lib computation to a threadpool to keep FastAPI async loop unblocked
        snapshot = await asyncio.to_thread(TechnicalAnalysisService.get_full_technical_snapshot, symbol)
        if "error" in snapshot:
            raise HTTPException(status_code=404, detail=snapshot["error"])
        snapshot = fix_nan(snapshot)
        return snapshot
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Technical analysis failed: {str(e)}")

from services.fundamental_analysis import get_fundamental_data

@router.get("/fundamental/{symbol}")
async def get_fundamental_analysis(symbol: str, refresh: bool = False):
    try:
        if refresh:
            from services.screener_in_service import _fundamentals_cache
            if symbol in _fundamentals_cache:
                del _fundamentals_cache[symbol]
                print(f"🔄 Cache cleared for {symbol}")

        data = await asyncio.to_thread(get_fundamental_data, symbol)
        if not data or data.get("source") == "error":
            raise HTTPException(status_code=404, detail="Failed to fetch fundamental data")
        data = fix_nan(data)
        return data
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Fundamental analysis failed: {str(e)}")

@router.get("/index/{symbol:path}")
async def get_index_analysis_endpoint(symbol: str):
  from services.index_etf_analysis import get_index_analysis
  data = await asyncio.to_thread(get_index_analysis, symbol)
  if not data:
    raise HTTPException(status_code=404, detail="Index not found")
  data = fix_nan(data)
  return data

@router.get("/etf/{symbol}")
async def get_etf_analysis_endpoint(symbol: str):
  from services.index_etf_analysis import get_etf_analysis
  data = await asyncio.to_thread(get_etf_analysis, symbol)
  if not data:
    raise HTTPException(status_code=404, detail="ETF not found")
  data = fix_nan(data)
  return data

@router.get("/institutional/{symbol}")
async def get_institutional_activity(symbol: str, refresh: bool = False):
  try:
    from services.institutional_service import get_institutional_data
    # Run the scraping in a separate thread so it doesn't block the async loop
    data = await asyncio.to_thread(get_institutional_data, symbol, refresh)
    data = fix_nan(data)
    return data
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(
      status_code=404,
      detail=str(e)
    )

@router.get("/market-pulse")
async def get_market_pulse():
  from services.index_etf_analysis import get_index_analysis
  
  # Fetch all major indices
  indices = [
    {"symbol": "^NSEI", "name": "Nifty 50"},
    {"symbol": "^NSEBANK", "name": "Bank Nifty"},
    {"symbol": "^CNXIT", "name": "Nifty IT"},
    {"symbol": "^CNXPHARMA", "name": "Nifty Pharma"},
    {"symbol": "^CNXAUTO", "name": "Nifty Auto"},
  ]
  
  results = []
  for idx in indices:
    data = get_index_analysis(idx['symbol'])
    if data:
      data['name'] = idx['name']
      results.append(data)
  
  return results

@router.get("/patterns/{symbol}")
async def get_pattern_analysis(symbol: str):
  try:
    from services.technical_analysis import (
      TechnicalAnalysisService
    )
    from services.pattern_service import (
      get_pattern_analysis as fetch_pattern_analysis
    )
    
    # Get technical data for context
    tech = TechnicalAnalysisService.get_full_technical_snapshot(symbol)
    
    # Extract from nested structure
    trend_data = tech.get('trend', {})
    structure_data = tech.get('structure', {})
    momentum_data = tech.get('momentum', {})
    
    # Current price
    emas = trend_data.get('emas', {})
    current_price = float(
      structure_data.get('current_price') or
      emas.get('ema10') or
      0
    )
    
    # Support/Resistance — nested in 
    # support_resistance key
    sr_data = structure_data.get(
      'support_resistance', {}
    )
    support = float(
      sr_data.get('support') or
      sr_data.get('key_support') or
      sr_data.get('s1') or
      0
    )
    resistance = float(
      sr_data.get('resistance') or
      sr_data.get('key_resistance') or
      sr_data.get('r1') or
      0
    )
    
    # RSI — could be dict or float
    rsi_raw = momentum_data.get('rsi', 50)
    if isinstance(rsi_raw, dict):
      rsi = float(
        rsi_raw.get('value') or 
        rsi_raw.get('rsi') or 
        50
      )
    else:
      rsi = float(rsi_raw or 50)
    
    # Trend
    trend = (
      trend_data.get('status') or
      trend_data.get('trend') or
      'Neutral'
    )
    
    print(f"SR keys: {list(sr_data.keys())}")
    print(f"Final: price={current_price} "
          f"support={support} "
          f"resistance={resistance} "
          f"rsi={rsi} trend={trend}")
    
    # Get pattern analysis
    result = fetch_pattern_analysis(
      symbol=symbol,
      current_price=current_price,
      support=support,
      resistance=resistance,
      rsi=rsi,
      trend=trend
    )
    
    result['symbol'] = symbol
    result['current_price'] = current_price
    result['rsi'] = rsi
    result['trend'] = trend
    
    result = fix_nan(result)
    return result
    
  except Exception as e:
    raise HTTPException(
      status_code=500,
      detail=str(e)
    )

@router.post("/patterns/scan")
async def start_pattern_scan(
  request: dict,
  background_tasks: BackgroundTasks
):
  patterns_to_find = request.get(
    'patterns', []
  )
  scan_scope = request.get('scope', 'nifty50')
  scan_id = str(int(__import__('time').time()))
  
  # Initialize scan status
  _scan_status[scan_id] = {
    'status': 'running',
    'progress': 0,
    'total': 0,
    'current_stock': '',
    'results': []
  }
  
  # Start background scan
  background_tasks.add_task(
    run_pattern_scan,
    scan_id,
    patterns_to_find,
    scan_scope
  )
  
  return {'scan_id': scan_id}


@router.get("/patterns/scan/{scan_id}")
async def get_scan_status(scan_id: str):
  if scan_id not in _scan_status:
    raise HTTPException(
      status_code=404,
      detail="Scan not found"
    )
  return _scan_status[scan_id]


async def run_pattern_scan(
  scan_id: str,
  patterns_to_find: list,
  scope: str
):
  from services.market_data import NIFTY_50_SYMBOLS
  from services.pattern_service import (
    get_pattern_analysis
  )
  from services.technical_analysis import (
    TechnicalAnalysisService
  )
  
  # Define symbols to scan
  if scope == 'nifty50':
    symbols = NIFTY_50_SYMBOLS[:50]
  else:
    symbols = NIFTY_50_SYMBOLS
  
  total = len(symbols)
  _scan_status[scan_id]['total'] = total
  results = []
  
  for i, symbol in enumerate(symbols):
    try:
      _scan_status[scan_id]['current_stock'] = symbol
      _scan_status[scan_id]['progress'] = i + 1
      
      # Get technical data
      tech = TechnicalAnalysisService.get_full_technical_snapshot(symbol)
      trend_data = tech.get('trend', {})
      structure_data = tech.get('structure', {})
      momentum_data = tech.get('momentum', {})
      
      emas = trend_data.get('emas', {})
      current_price = float(
        structure_data.get('current_price') or
        emas.get('ema10') or 0
      )
      
      sr_data = structure_data.get(
        'support_resistance', {}
      )
      support = float(
        sr_data.get('support') or 0
      )
      resistance = float(
        sr_data.get('resistance') or 0
      )
      
      rsi_raw = momentum_data.get('rsi', 50)
      rsi = float(
        rsi_raw.get('value') 
        if isinstance(rsi_raw, dict) 
        else rsi_raw or 50
      )
      
      trend = trend_data.get('status', 'Neutral')
      
      # Get patterns for this stock
      pattern_result = get_pattern_analysis(
        symbol=symbol,
        current_price=current_price,
        support=support,
        resistance=resistance,
        rsi=rsi,
        trend=trend
      )
      
      found_patterns = pattern_result.get(
        'patterns', []
      )
      
      # Check if any requested patterns found
      matched = []
      for p in found_patterns:
        if (not patterns_to_find or 
            p['name'] in patterns_to_find or
            'All' in patterns_to_find):
          matched.append(p)
      
      if matched:
        # Get stock name
        clean = symbol.replace('.NS','')
        results.append({
          'symbol': symbol,
          'name': clean,
          'price': round(current_price, 2),
          'rsi': round(rsi, 1),
          'trend': trend,
          'patterns': matched,
          'trade_setup': pattern_result.get(
            'trade_setup', {}
          )
        })
        
        # Update results in real time
        _scan_status[scan_id]['results'] = results
        
      print(f"[{i+1}/{total}] {symbol}: "
            f"{len(matched)} patterns matched")
      
      # Small delay to not overwhelm APIs
      await asyncio.sleep(0.5)
      
    except Exception as e:
      print(f"⚠️ Scan error for {symbol}: {e}")
      _scan_status[scan_id]['progress'] = i + 1
      continue
  
  _scan_status[scan_id]['status'] = 'completed'
  _scan_status[scan_id]['results'] = results
  print(f"✅ Scan complete: {len(results)} matches")
