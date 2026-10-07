from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import Annotated, List, Literal
import asyncio
import logging
import math
import json
import time
import uuid

from routers.auth import get_current_user

logger = logging.getLogger(__name__)

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
_scan_status = {}
# scan_id -> {'user_id', 'finished_at'}. Kept apart from _scan_status so the
# owner never appears in the polling response.
_scan_owner = {}
# Finished scans are dropped after an hour so the dicts cannot grow forever.
SCAN_TTL_SECONDS = 3600
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
    except Exception:
        logger.exception("Technical analysis failed for %s", symbol)
        raise HTTPException(status_code=500, detail="Technical analysis failed. See server logs.")

from services.fundamental_analysis import get_fundamental_data

@router.get("/fundamental/{symbol}")
async def get_fundamental_analysis(symbol: str, refresh: bool = False):
    try:
        if refresh:
            from services.screener_in_service import _fundamental_cache
            if symbol in _fundamental_cache:
                del _fundamental_cache[symbol]
                print(f"🔄 Cache cleared for {symbol}")

        data = await asyncio.to_thread(get_fundamental_data, symbol)
        if not data or data.get("source") == "error":
            raise HTTPException(status_code=404, detail="Failed to fetch fundamental data")
        data = fix_nan(data)
        return data
    except HTTPException:
        raise
    except Exception:
        logger.exception("Fundamental analysis failed for %s", symbol)
        raise HTTPException(status_code=500, detail="Fundamental analysis failed. See server logs.")

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
  except Exception:
    logger.exception("Institutional data failed for %s", symbol)
    raise HTTPException(
      status_code=404,
      detail="Institutional data is unavailable for this symbol"
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
    
  except Exception:
    logger.exception("Pattern analysis failed for %s", symbol)
    raise HTTPException(
      status_code=500,
      detail="Pattern analysis failed. See server logs."
    )

class PatternScanRequest(BaseModel):
  patterns: List[Annotated[str, Field(max_length=64)]] = Field(default_factory=list, max_length=50)
  scope: Literal['nifty50', 'all'] = 'nifty50'


def _evict_old_scans():
  cutoff = time.time() - SCAN_TTL_SECONDS
  for sid in [s for s, info in _scan_owner.items()
              if info['finished_at'] and info['finished_at'] < cutoff]:
    _scan_owner.pop(sid, None)
    _scan_status.pop(sid, None)


@router.post("/patterns/scan")
async def start_pattern_scan(
  body: PatternScanRequest,
  background_tasks: BackgroundTasks,
  current_user = Depends(get_current_user)
):
  _evict_old_scans()

  # Each scan walks the whole universe with a pause per stock, so one at a time
  # per user is plenty; more would only queue up upstream requests.
  if any(info['user_id'] == current_user.id and info['finished_at'] is None
         for info in _scan_owner.values()):
    raise HTTPException(
      status_code=429,
      detail="You already have a scan running. Wait for it to finish."
    )

  # Random, not a timestamp: a timestamp is guessable, and two scans started
  # in the same second used to overwrite each other.
  scan_id = uuid.uuid4().hex
  _scan_owner[scan_id] = {'user_id': current_user.id, 'finished_at': None}

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
    _run_scan_guarded,
    scan_id,
    body.patterns,
    body.scope
  )

  return {'scan_id': scan_id}


@router.get("/patterns/scan/{scan_id}")
async def get_scan_status(
  scan_id: str,
  current_user = Depends(get_current_user)
):
  owner = _scan_owner.get(scan_id)
  # Another user's scan answers exactly like a missing one.
  if owner is None or owner['user_id'] != current_user.id:
    raise HTTPException(
      status_code=404,
      detail="Scan not found"
    )
  return _scan_status[scan_id]


async def _run_scan_guarded(scan_id: str, patterns_to_find: list, scope: str):
  # Always mark the scan finished, even if it crashes outright. Otherwise the
  # one-running-scan-per-user rule would lock that user out until a restart.
  try:
    await run_pattern_scan(scan_id, patterns_to_find, scope)
  except Exception:
    logger.exception("Pattern scan %s failed", scan_id)
    _scan_status[scan_id]['status'] = 'completed'
  finally:
    _scan_owner[scan_id]['finished_at'] = time.time()


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
