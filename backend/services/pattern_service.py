import pandas as pd
import numpy as np
from typing import List, Dict

def detect_candlestick_patterns(
  hist: pd.DataFrame
) -> List[Dict]:
  
  patterns = []
  
  if hist is None or len(hist) < 3:
    return patterns
  
  # Ensure datetime index
  hist.index = pd.to_datetime(hist.index)
  if hasattr(hist.index, 'tz') and hist.index.tz:
    hist.index = hist.index.tz_localize(None)
  
  opens = hist['Open']
  highs = hist['High']
  lows = hist['Low']
  closes = hist['Close']
  volumes = hist['Volume']
  
  # Check last 10 candles for patterns
  lookback = min(10, len(hist))
  recent = hist.iloc[-lookback:]
  
  for i in range(len(recent) - 1, -1, -1):
    if i < 1:
      continue
    
    idx = recent.index[i]
    date_str = idx.strftime('%b %d')
    
    o = float(recent['Open'].iloc[i])
    h = float(recent['High'].iloc[i])
    l = float(recent['Low'].iloc[i])
    c = float(recent['Close'].iloc[i])
    v = float(recent['Volume'].iloc[i])
    
    prev_o = float(recent['Open'].iloc[i-1])
    prev_c = float(recent['Close'].iloc[i-1])
    prev_h = float(recent['High'].iloc[i-1])
    prev_l = float(recent['Low'].iloc[i-1])
    
    body = abs(c - o)
    prev_body = abs(prev_c - prev_o)
    candle_range = h - l
    avg_volume = float(recent['Volume'].mean())
    
    if candle_range == 0:
      continue
    
    # 1. DOJI
    if body <= candle_range * 0.1:
      patterns.append({
        'name': 'Doji',
        'date': date_str,
        'type': 'neutral',
        'signal': 'Indecision — potential reversal',
        'confidence': 65,
        'emoji': '🟡'
      })
    
    # 2. HAMMER (Bullish)
    lower_wick = min(o, c) - l
    upper_wick = h - max(o, c)
    if (lower_wick >= body * 2 and
        upper_wick <= body * 0.3 and
        c > o):
      patterns.append({
        'name': 'Hammer',
        'date': date_str,
        'type': 'bullish',
        'signal': 'Bullish reversal signal',
        'confidence': 72,
        'emoji': '🟢'
      })
    
    # 3. SHOOTING STAR (Bearish)
    if (upper_wick >= body * 2 and
        lower_wick <= body * 0.3 and
        c < o):
      patterns.append({
        'name': 'Shooting Star',
        'date': date_str,
        'type': 'bearish',
        'signal': 'Bearish reversal signal',
        'confidence': 72,
        'emoji': '🔴'
      })
    
    # 4. BULLISH ENGULFING
    if (prev_c < prev_o and
        c > o and
        c > prev_o and
        o < prev_c and
        body > prev_body):
      patterns.append({
        'name': 'Bullish Engulfing',
        'date': date_str,
        'type': 'bullish',
        'signal': 'Strong bullish reversal',
        'confidence': 78,
        'emoji': '🟢'
      })
    
    # 5. BEARISH ENGULFING
    if (prev_c > prev_o and
        c < o and
        c < prev_o and
        o > prev_c and
        body > prev_body):
      patterns.append({
        'name': 'Bearish Engulfing',
        'date': date_str,
        'type': 'bearish',
        'signal': 'Strong bearish reversal',
        'confidence': 78,
        'emoji': '🔴'
      })
    
    # 6. MORNING STAR (Bullish, needs 3 candles)
    if i >= 2:
      prev2_o = float(recent['Open'].iloc[i-2])
      prev2_c = float(recent['Close'].iloc[i-2])
      prev2_body = abs(prev2_c - prev2_o)
      
      if (prev2_c < prev2_o and
          prev_body < prev2_body * 0.3 and
          c > o and
          c > (prev2_o + prev2_c) / 2):
        patterns.append({
          'name': 'Morning Star',
          'date': date_str,
          'type': 'bullish',
          'signal': 'Powerful bullish reversal',
          'confidence': 82,
          'emoji': '🟢'
        })
    
    # 7. EVENING STAR (Bearish, needs 3 candles)
    if i >= 2:
      prev2_o = float(recent['Open'].iloc[i-2])
      prev2_c = float(recent['Close'].iloc[i-2])
      prev2_body = abs(prev2_c - prev2_o)
      
      if (prev2_c > prev2_o and
          prev_body < prev2_body * 0.3 and
          c < o and
          c < (prev2_o + prev2_c) / 2):
        patterns.append({
          'name': 'Evening Star',
          'date': date_str,
          'type': 'bearish',
          'signal': 'Powerful bearish reversal',
          'confidence': 82,
          'emoji': '🔴'
        })
    
    # 8. BULLISH HARAMI
    if (prev_c < prev_o and
        c > o and
        o > prev_c and
        c < prev_o and
        body < prev_body * 0.6):
      patterns.append({
        'name': 'Bullish Harami',
        'date': date_str,
        'type': 'bullish',
        'signal': 'Potential bullish reversal',
        'confidence': 65,
        'emoji': '🟢'
      })
    
    # 9. BEARISH HARAMI
    if (prev_c > prev_o and
        c < o and
        o < prev_c and
        c > prev_o and
        body < prev_body * 0.6):
      patterns.append({
        'name': 'Bearish Harami',
        'date': date_str,
        'type': 'bearish',
        'signal': 'Potential bearish reversal',
        'confidence': 65,
        'emoji': '🔴'
      })
    
    # Limit to 5 most recent patterns
    if len(patterns) >= 5:
      break
  
  return patterns[:5]


def find_peaks_troughs(prices, window=5):
  peaks = []
  troughs = []
  
  for i in range(window, len(prices) - window):
    slice_left = prices[i-window:i]
    slice_right = prices[i+1:i+window+1]
    current = prices[i]
    
    if current > max(slice_left) and current > max(slice_right):
      peaks.append((i, current))
    
    if current < min(slice_left) and current < min(slice_right):
      troughs.append((i, current))
  
  return peaks, troughs


def detect_double_top(highs, closes, dates, 
                      tolerance=0.03):
  results = []
  prices = list(highs)
  peaks, troughs = find_peaks_troughs(prices)
  
  if len(peaks) < 2:
    return results
  
  # Check last 3 peak pairs
  recent_peaks = peaks[-4:]
  
  for i in range(len(recent_peaks) - 1):
    p1_idx, p1_price = recent_peaks[i]
    p2_idx, p2_price = recent_peaks[i+1]
    
    # Peaks should be at similar price
    price_diff = abs(p1_price - p2_price) / p1_price
    if price_diff > tolerance:
      continue
    
    # Find valley between peaks
    valley_prices = prices[p1_idx:p2_idx]
    if not valley_prices:
      continue
    valley_price = min(valley_prices)
    
    # Valley should be at least 3% below peaks
    avg_peak = (p1_price + p2_price) / 2
    if valley_price > avg_peak * 0.97:
      continue
    
    # Current price should be near or below valley
    current = float(closes.iloc[-1])
    
    # Calculate target (distance from peak to valley)
    distance = avg_peak - valley_price
    target = valley_price - distance
    
    confidence = 60
    if price_diff < 0.015:
      confidence += 5
    if current < valley_price:
      confidence += 10
    
    date_str = dates[p2_idx].strftime('%b %d') if hasattr(dates[p2_idx], 'strftime') else str(dates[p2_idx])[:6]
    
    results.append({
      'name': 'Double Top',
      'date': date_str,
      'type': 'bearish',
      'signal': 'Potential bearish reversal — two peaks at similar level',
      'confidence': min(confidence, 70),
      'emoji': '🔴',
      'peak1_price': round(p1_price, 2),
      'peak2_price': round(p2_price, 2),
      'valley_price': round(valley_price, 2),
      'target': round(target, 2),
    })
  
  return results[-1:] if results else []


def detect_double_bottom(lows, closes, dates,
                         tolerance=0.03):
  results = []
  prices = list(lows)
  peaks, troughs = find_peaks_troughs(prices)
  
  if len(troughs) < 2:
    return results
  
  recent_troughs = troughs[-4:]
  
  for i in range(len(recent_troughs) - 1):
    t1_idx, t1_price = recent_troughs[i]
    t2_idx, t2_price = recent_troughs[i+1]
    
    price_diff = abs(t1_price - t2_price) / t1_price
    if price_diff > tolerance:
      continue
    
    # Find peak between troughs
    peak_prices = prices[t1_idx:t2_idx]
    if not peak_prices:
      continue
    peak_price = max(peak_prices)
    
    # Peak should be at least 3% above troughs
    avg_trough = (t1_price + t2_price) / 2
    if peak_price < avg_trough * 1.03:
      continue
    
    current = float(closes.iloc[-1])
    
    # Target = distance from trough to peak
    distance = peak_price - avg_trough
    target = peak_price + distance
    
    confidence = 60
    if price_diff < 0.015:
      confidence += 5
    if current > peak_price:
      confidence += 10
    
    date_str = dates[t2_idx].strftime('%b %d') if hasattr(dates[t2_idx], 'strftime') else str(dates[t2_idx])[:6]
    
    results.append({
      'name': 'Double Bottom',
      'date': date_str,
      'type': 'bullish',
      'signal': 'Potential bullish reversal — two troughs at similar level',
      'confidence': min(confidence, 70),
      'emoji': '🟢',
      'trough1_price': round(t1_price, 2),
      'trough2_price': round(t2_price, 2),
      'peak_price': round(peak_price, 2),
      'target': round(target, 2),
    })
  
  return results[-1:] if results else []


def detect_head_and_shoulders(highs, closes, 
                               dates, tolerance=0.04):
  results = []
  prices = list(highs)
  peaks, troughs = find_peaks_troughs(prices, window=4)
  
  if len(peaks) < 3:
    return results
  
  recent_peaks = peaks[-5:]
  
  for i in range(len(recent_peaks) - 2):
    left_idx, left_price = recent_peaks[i]
    head_idx, head_price = recent_peaks[i+1]
    right_idx, right_price = recent_peaks[i+2]
    
    # Head must be highest
    if not (head_price > left_price and 
            head_price > right_price):
      continue
    
    # Shoulders should be at similar level
    shoulder_diff = abs(left_price - right_price) / left_price
    if shoulder_diff > tolerance:
      continue
    
    # Head should be notably higher than shoulders
    avg_shoulder = (left_price + right_price) / 2
    if head_price < avg_shoulder * 1.02:
      continue
    
    # Find neckline (troughs between peaks)
    left_troughs = [t for t in troughs 
                    if left_idx < t[0] < head_idx]
    right_troughs = [t for t in troughs 
                     if head_idx < t[0] < right_idx]
    
    if not left_troughs or not right_troughs:
      continue
    
    neckline = (
      left_troughs[-1][1] + right_troughs[0][1]
    ) / 2
    
    current = float(closes.iloc[-1])
    
    # Target = head to neckline distance
    distance = head_price - neckline
    target = neckline - distance
    
    confidence = 58
    if shoulder_diff < 0.02:
      confidence += 7
    if current < neckline:
      confidence += 10
    
    date_str = dates[right_idx].strftime('%b %d') if hasattr(dates[right_idx], 'strftime') else str(dates[right_idx])[:6]
    
    results.append({
      'name': 'Head & Shoulders',
      'date': date_str,
      'type': 'bearish',
      'signal': 'Classic bearish reversal — head higher than both shoulders',
      'confidence': min(confidence, 72),
      'emoji': '🔴',
      'neckline': round(neckline, 2),
      'target': round(target, 2),
    })
  
  return results[-1:] if results else []


def detect_inverse_head_and_shoulders(
    lows, closes, dates, tolerance=0.04):
  results = []
  prices = list(lows)
  peaks, troughs = find_peaks_troughs(prices, window=4)
  
  if len(troughs) < 3:
    return results
  
  recent_troughs = troughs[-5:]
  
  for i in range(len(recent_troughs) - 2):
    left_idx, left_price = recent_troughs[i]
    head_idx, head_price = recent_troughs[i+1]
    right_idx, right_price = recent_troughs[i+2]
    
    # Head must be lowest
    if not (head_price < left_price and 
            head_price < right_price):
      continue
    
    # Shoulders at similar level
    shoulder_diff = abs(left_price - right_price) / left_price
    if shoulder_diff > tolerance:
      continue
    
    avg_shoulder = (left_price + right_price) / 2
    if head_price > avg_shoulder * 0.98:
      continue
    
    left_peaks = [p for p in peaks 
                  if left_idx < p[0] < head_idx]
    right_peaks = [p for p in peaks 
                   if head_idx < p[0] < right_idx]
    
    if not left_peaks or not right_peaks:
      continue
    
    neckline = (
      left_peaks[-1][1] + right_peaks[0][1]
    ) / 2
    
    current = float(closes.iloc[-1])
    distance = neckline - head_price
    target = neckline + distance
    
    confidence = 58
    if shoulder_diff < 0.02:
      confidence += 7
    if current > neckline:
      confidence += 10
    
    date_str = dates[right_idx].strftime('%b %d') if hasattr(dates[right_idx], 'strftime') else str(dates[right_idx])[:6]
    
    results.append({
      'name': 'Inverse Head & Shoulders',
      'date': date_str,
      'type': 'bullish',
      'signal': 'Classic bullish reversal — head lower than both shoulders',
      'confidence': min(confidence, 72),
      'emoji': '🟢',
      'neckline': round(neckline, 2),
      'target': round(target, 2),
    })
  
  return results[-1:] if results else []


def detect_bull_flag(closes, highs, lows, 
                     dates, volumes):
  results = []
  
  try:
    prices = list(closes)
    n = len(prices)
    
    if n < 20:
      return results
    
    # Look for bull flag in last 30 candles
    lookback = min(30, n)
    recent_closes = prices[-lookback:]
    recent_highs = list(highs)[-lookback:]
    recent_lows = list(lows)[-lookback:]
    recent_vols = list(volumes)[-lookback:]
    recent_dates = list(dates)[-lookback:]
    
    # Step 1 — Find the pole
    # Strong upward move of at least 5% in 3-8 candles
    for pole_start in range(0, lookback - 10):
      for pole_end in range(
        pole_start + 3, 
        min(pole_start + 9, lookback - 5)
      ):
        pole_start_price = recent_closes[pole_start]
        pole_end_price = recent_closes[pole_end]
        pole_gain = (
          (pole_end_price - pole_start_price) / 
          pole_start_price
        )
        
        # Pole must be strong upward move (>5%)
        if pole_gain < 0.05:
          continue
        
        # Check pole is mostly upward
        pole_prices = recent_closes[pole_start:pole_end+1]
        if pole_end_price != max(pole_prices):
          continue
        
        # Step 2 — Find the flag (consolidation)
        # Price should drift slightly down or sideways
        flag_start = pole_end
        flag_end = min(flag_start + 8, lookback - 1)
        
        if flag_end <= flag_start + 2:
          continue
        
        flag_prices = recent_closes[flag_start:flag_end+1]
        flag_high = max(flag_prices)
        flag_low = min(flag_prices)
        flag_range = (flag_high - flag_low) / flag_high
        
        # Flag should be tight consolidation (<4%)
        if flag_range > 0.04:
          continue
        
        # Flag should not give back more than 
        # 50% of pole gain
        flag_retrace = (
          (flag_high - flag_prices[-1]) / 
          (pole_end_price - pole_start_price)
        )
        if flag_retrace > 0.5:
          continue
        
        # Volume should decrease during flag
        pole_vols = recent_vols[pole_start:pole_end+1]
        flag_vols = recent_vols[flag_start:flag_end+1]
        
        avg_pole_vol = sum(pole_vols) / len(pole_vols)
        avg_flag_vol = sum(flag_vols) / len(flag_vols)
        
        vol_decreasing = avg_flag_vol < avg_pole_vol
        
        # Calculate target
        pole_size = pole_end_price - pole_start_price
        current_price = flag_prices[-1]
        target = current_price + pole_size
        
        confidence = 62
        if vol_decreasing:
          confidence += 8
        if flag_range < 0.02:
          confidence += 5
        if pole_gain > 0.08:
          confidence += 5
        
        date_idx = min(flag_end, len(recent_dates)-1)
        date_val = recent_dates[date_idx]
        date_str = (
          date_val.strftime('%b %d') 
          if hasattr(date_val, 'strftime') 
          else str(date_val)[:6]
        )
        
        results.append({
          'name': 'Bull Flag',
          'date': date_str,
          'type': 'bullish',
          'signal': (
            'Bullish continuation — strong pole '
            'with tight consolidation'
          ),
          'confidence': min(confidence, 75),
          'emoji': '🟢',
          'pole_gain_pct': round(pole_gain * 100, 1),
          'flag_range_pct': round(flag_range * 100, 1),
          'target': round(target, 2),
          'volume_confirmed': vol_decreasing
        })
        
        # Return most recent bull flag only
        return results[-1:]
  
  except Exception as e:
    print(f"⚠️ Bull flag detection error: {e}")
  
  return results


def detect_bear_flag(closes, highs, lows,
                     dates, volumes):
  results = []
  
  try:
    prices = list(closes)
    n = len(prices)
    
    if n < 20:
      return results
    
    lookback = min(30, n)
    recent_closes = prices[-lookback:]
    recent_highs = list(highs)[-lookback:]
    recent_lows = list(lows)[-lookback:]
    recent_vols = list(volumes)[-lookback:]
    recent_dates = list(dates)[-lookback:]
    
    # Step 1 — Find the pole (strong downward move)
    for pole_start in range(0, lookback - 10):
      for pole_end in range(
        pole_start + 3,
        min(pole_start + 9, lookback - 5)
      ):
        pole_start_price = recent_closes[pole_start]
        pole_end_price = recent_closes[pole_end]
        pole_drop = (
          (pole_start_price - pole_end_price) /
          pole_start_price
        )
        
        # Pole must be strong downward move (>5%)
        if pole_drop < 0.05:
          continue
        
        # Check pole is mostly downward
        pole_prices = recent_closes[pole_start:pole_end+1]
        if pole_end_price != min(pole_prices):
          continue
        
        # Step 2 — Find the flag
        flag_start = pole_end
        flag_end = min(flag_start + 8, lookback - 1)
        
        if flag_end <= flag_start + 2:
          continue
        
        flag_prices = recent_closes[flag_start:flag_end+1]
        flag_high = max(flag_prices)
        flag_low = min(flag_prices)
        flag_range = (flag_high - flag_low) / flag_low
        
        # Tight consolidation
        if flag_range > 0.04:
          continue
        
        # Flag should not recover more than
        # 50% of pole drop
        flag_recover = (
          (flag_prices[-1] - flag_low) /
          (pole_start_price - pole_end_price)
        )
        if flag_recover > 0.5:
          continue
        
        # Volume decreasing during flag
        pole_vols = recent_vols[pole_start:pole_end+1]
        flag_vols = recent_vols[flag_start:flag_end+1]
        avg_pole_vol = sum(pole_vols) / len(pole_vols)
        avg_flag_vol = sum(flag_vols) / len(flag_vols)
        vol_decreasing = avg_flag_vol < avg_pole_vol
        
        # Target
        pole_size = pole_start_price - pole_end_price
        current_price = flag_prices[-1]
        target = current_price - pole_size
        
        confidence = 62
        if vol_decreasing:
          confidence += 8
        if flag_range < 0.02:
          confidence += 5
        if pole_drop > 0.08:
          confidence += 5
        
        date_idx = min(flag_end, len(recent_dates)-1)
        date_val = recent_dates[date_idx]
        date_str = (
          date_val.strftime('%b %d')
          if hasattr(date_val, 'strftime')
          else str(date_val)[:6]
        )
        
        results.append({
          'name': 'Bear Flag',
          'date': date_str,
          'type': 'bearish',
          'signal': (
            'Bearish continuation — strong drop '
            'with tight consolidation'
          ),
          'confidence': min(confidence, 75),
          'emoji': '🔴',
          'pole_drop_pct': round(pole_drop * 100, 1),
          'flag_range_pct': round(flag_range * 100, 1),
          'target': round(target, 2),
          'volume_confirmed': vol_decreasing
        })
        
        return results[-1:]
  
  except Exception as e:
    print(f"⚠️ Bear flag detection error: {e}")
  
  return results


def detect_cup_and_handle(closes, highs, 
                           lows, dates, volumes):
  results = []
  
  try:
    prices = list(closes)
    n = len(prices)
    
    if n < 30:
      return results
    
    # Need at least 30 candles for cup
    lookback = min(60, n)
    recent_closes = prices[-lookback:]
    recent_highs = list(highs)[-lookback:]
    recent_lows = list(lows)[-lookback:]
    recent_vols = list(volumes)[-lookback:]
    recent_dates = list(dates)[-lookback:]
    
    # Step 1 — Find left rim of cup
    # High point in first third
    first_third = lookback // 3
    left_rim_idx = recent_closes.index(
      max(recent_closes[:first_third])
    )
    left_rim_price = recent_closes[left_rim_idx]
    
    # Step 2 — Find bottom of cup
    # Lowest point in middle third
    mid_start = first_third
    mid_end = (lookback * 2) // 3
    cup_bottom_prices = recent_closes[mid_start:mid_end]
    
    if not cup_bottom_prices:
      return results
    
    cup_bottom_price = min(cup_bottom_prices)
    cup_bottom_idx = mid_start + cup_bottom_prices.index(
      cup_bottom_price
    )
    
    # Step 3 — Find right rim of cup
    # High point in last third before handle
    last_third_start = (lookback * 2) // 3
    last_third_end = lookback - 5
    
    if last_third_end <= last_third_start:
      return results
    
    right_rim_prices = recent_closes[
      last_third_start:last_third_end
    ]
    
    if not right_rim_prices:
      return results
    
    right_rim_price = max(right_rim_prices)
    right_rim_idx = last_third_start + right_rim_prices.index(
      right_rim_price
    )
    
    # Cup validation checks
    
    # Both rims should be at similar level (within 5%)
    rim_diff = abs(left_rim_price - right_rim_price) / left_rim_price
    if rim_diff > 0.05:
      return results
    
    # Cup depth should be 15-50% from rim to bottom
    avg_rim = (left_rim_price + right_rim_price) / 2
    cup_depth = (avg_rim - cup_bottom_price) / avg_rim
    if cup_depth < 0.12 or cup_depth > 0.50:
      return results
    
    # Cup should be rounded (U-shape not V-shape)
    # Check middle of cup isn't too sharp
    cup_prices = recent_closes[cup_bottom_idx-3:cup_bottom_idx+4]
    if len(cup_prices) >= 3:
      avg_bottom = sum(cup_prices) / len(cup_prices)
      # Bottom should be relatively flat
      bottom_range = (max(cup_prices) - min(cup_prices)) / avg_bottom
      if bottom_range > 0.06:
        return results
    
    # Step 4 — Find handle
    # Small pullback after right rim (last 5 candles)
    handle_prices = recent_closes[last_third_end:]
    
    if len(handle_prices) < 3:
      return results
    
    handle_high = max(handle_prices)
    handle_low = min(handle_prices)
    handle_range = (handle_high - handle_low) / handle_high
    
    # Handle should be small pullback (< 15% of cup depth)
    handle_retrace = (handle_high - handle_low) / (avg_rim - cup_bottom_price)
    if handle_retrace > 0.50:
      return results
    
    # Handle should not drop below middle of cup
    if handle_low < cup_bottom_price + (avg_rim - cup_bottom_price) * 0.5:
      return results
    
    # Current price near right rim = breakout potential
    current_price = recent_closes[-1]
    
    # Target = cup depth added to breakout point
    target = avg_rim + (avg_rim - cup_bottom_price)
    
    # Confidence calculation
    confidence = 65
    
    # Rims at very similar level
    if rim_diff < 0.02:
      confidence += 8
    
    # Good cup depth (not too shallow or deep)
    if 0.15 < cup_depth < 0.35:
      confidence += 5
    
    # Handle is tight
    if handle_range < 0.03:
      confidence += 7
    
    # Price near breakout point
    breakout_proximity = abs(current_price - avg_rim) / avg_rim
    if breakout_proximity < 0.03:
      confidence += 8
    elif breakout_proximity < 0.05:
      confidence += 4
    
    # Volume check — should be higher on right rim
    left_vol = sum(recent_vols[:first_third]) / first_third
    right_vol = sum(recent_vols[last_third_start:last_third_end]) / max(last_third_end - last_third_start, 1)
    vol_expanding = right_vol > left_vol * 0.8
    
    if vol_expanding:
      confidence += 5
    
    date_val = recent_dates[-1]
    date_str = (
      date_val.strftime('%b %d')
      if hasattr(date_val, 'strftime')
      else str(date_val)[:6]
    )
    
    results.append({
      'name': 'Cup & Handle',
      'date': date_str,
      'type': 'bullish',
      'signal': (
        'Powerful bullish continuation — '
        'rounded base with handle consolidation'
      ),
      'confidence': min(confidence, 80),
      'emoji': '🟢',
      'cup_depth_pct': round(cup_depth * 100, 1),
      'left_rim': round(left_rim_price, 2),
      'right_rim': round(right_rim_price, 2),
      'cup_bottom': round(cup_bottom_price, 2),
      'target': round(target, 2),
      'volume_confirmed': vol_expanding
    })
    
  except Exception as e:
    print(f"⚠️ Cup & Handle error: {e}")
  
  return results


def calculate_trade_setup(
  patterns: List[Dict],
  current_price: float,
  support: float,
  resistance: float,
  rsi: float,
  trend: str
) -> Dict:
  
  if not patterns or not current_price:
    return {}
  
  # Determine overall bias from patterns
  bullish = sum(
    1 for p in patterns 
    if p['type'] == 'bullish'
  )
  bearish = sum(
    1 for p in patterns 
    if p['type'] == 'bearish'
  )
  
  # Latest pattern drives the setup
  latest = patterns[0]
  
  if latest['type'] == 'bullish':
    bias = 'Bullish'
    entry = round(current_price, 2)
    stop_loss = round(
      support * 0.99 
      if support else current_price * 0.96, 
      2
    )
    risk = entry - stop_loss
    target1 = round(entry + risk * 1.5, 2)
    target2 = round(entry + risk * 2.5, 2)
    action = 'Consider Long Entry'
    
  elif latest['type'] == 'bearish':
    bias = 'Bearish'
    entry = round(current_price, 2)
    stop_loss = round(
      resistance * 1.01 
      if resistance else current_price * 1.04,
      2
    )
    risk = stop_loss - entry
    target1 = round(entry - risk * 1.5, 2)
    target2 = round(entry - risk * 2.5, 2)
    action = 'Avoid Long / Wait'
    
  else:
    bias = 'Neutral'
    entry = round(current_price, 2)
    stop_loss = round(
      support * 0.99 
      if support else current_price * 0.96,
      2
    )
    risk = entry - stop_loss
    target1 = round(entry + risk * 1.5, 2)
    target2 = round(entry + risk * 2.5, 2)
    action = 'Wait for confirmation'
  
  # Adjust confidence based on RSI context
  confidence = latest.get('confidence', 65)
  
  if bias == 'Bullish' and rsi and rsi < 40:
    confidence = min(confidence + 10, 95)
  elif bias == 'Bullish' and rsi and rsi > 70:
    confidence = max(confidence - 15, 30)
  elif bias == 'Bearish' and rsi and rsi > 65:
    confidence = min(confidence + 10, 95)
  elif bias == 'Bearish' and rsi and rsi < 35:
    confidence = max(confidence - 15, 30)
  
  # Trend alignment bonus
  if (bias == 'Bullish' and 
      trend and 'uptrend' in trend.lower()):
    confidence = min(confidence + 8, 95)
  elif (bias == 'Bearish' and 
        trend and 'downtrend' in trend.lower()):
    confidence = min(confidence + 8, 95)
  
  risk_reward = round(
    abs(target1 - entry) / abs(entry - stop_loss),
    1
  ) if abs(entry - stop_loss) > 0 else 0
  
  return {
    'bias': bias,
    'action': action,
    'entry': entry,
    'stop_loss': stop_loss,
    'target1': target1,
    'target2': target2,
    'risk_reward': risk_reward,
    'confidence': confidence,
    'bullish_count': bullish,
    'bearish_count': bearish,
    'neutral_count': len(patterns) - bullish - bearish
  }


def get_pattern_analysis(
  symbol: str,
  current_price: float,
  support: float,
  resistance: float,
  rsi: float,
  trend: str
) -> Dict:
  
  try:
    import yfinance as yf
    ticker = yf.Ticker(symbol)
    hist = ticker.history(
      period='3mo', 
      interval='1d'
    )
    
    if hist is None or hist.empty:
      return {'patterns': [], 'trade_setup': {}}
    
    # Fix datetime
    hist.index = pd.to_datetime(hist.index)
    if hasattr(hist.index,'tz') and hist.index.tz:
      hist.index = hist.index.tz_localize(None)
    
    # Detect candlestick patterns
    candle_patterns = detect_candlestick_patterns(hist)
    
    # Detect chart patterns
    chart_patterns = []
    
    try:
      # Double Top
      dt = detect_double_top(
        hist['High'], hist['Close'], hist.index
      )
      chart_patterns.extend(dt)
    except Exception as e:
      print(f"⚠️ Double top error: {e}")
    
    try:
      # Double Bottom
      db = detect_double_bottom(
        hist['Low'], hist['Close'], hist.index
      )
      chart_patterns.extend(db)
    except Exception as e:
      print(f"⚠️ Double bottom error: {e}")
    
    try:
      # Head & Shoulders
      hs = detect_head_and_shoulders(
        hist['High'], hist['Close'], hist.index
      )
      chart_patterns.extend(hs)
    except Exception as e:
      print(f"⚠️ H&S error: {e}")
    
    try:
      # Inverse Head & Shoulders
      ihs = detect_inverse_head_and_shoulders(
        hist['Low'], hist['Close'], hist.index
      )
      chart_patterns.extend(ihs)
    except Exception as e:
      print(f"⚠️ Inverse H&S error: {e}")

    try:
      # Bull Flag
      bf = detect_bull_flag(
        hist['Close'], hist['High'],
        hist['Low'], hist.index, hist['Volume']
      )
      chart_patterns.extend(bf)
    except Exception as e:
      print(f"⚠️ Bull flag error: {e}")
    
    try:
      # Bear Flag
      brf = detect_bear_flag(
        hist['Close'], hist['High'],
        hist['Low'], hist.index, hist['Volume']
      )
      chart_patterns.extend(brf)
    except Exception as e:
      print(f"⚠️ Bear flag error: {e}")

    try:
      # Cup & Handle
      ch = detect_cup_and_handle(
        hist['Close'], hist['High'],
        hist['Low'], hist.index, hist['Volume']
      )
      chart_patterns.extend(ch)
      if ch:
        print(f"🏆 Cup & Handle detected!")
    except Exception as e:
      print(f"⚠️ Cup & Handle error: {e}")
    
    print(f"📊 Candlestick patterns: {len(candle_patterns)}")
    patterns = candle_patterns + chart_patterns
    
    if not current_price and not hist.empty:
      current_price = float(hist['Close'].iloc[-1])

    trade_setup = calculate_trade_setup(
      patterns=patterns,
      current_price=current_price,
      support=support,
      resistance=resistance,
      rsi=rsi,
      trend=trend
    )
    
    return {
      'patterns': patterns,
      'trade_setup': trade_setup,
      'candles_analyzed': len(hist)
    }
    
  except Exception as e:
    print(f"❌ Pattern analysis error: {e}")
    return {'patterns': [], 'trade_setup': {}}
