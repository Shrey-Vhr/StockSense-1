import yfinance as yf
import pandas_ta as ta
import numpy as np
import pandas as pd
import json
import asyncio
import os
import time
import logging
from datetime import datetime
import pytz
from services.angel_one_service import angel_one

logger = logging.getLogger(__name__)

def is_market_open():
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    print(f"⏰ Current IST time: {now.strftime('%H:%M:%S')}")
    print(f"📅 Weekday: {now.weekday()} (0=Mon, 6=Sun)")
    
    if now.weekday() >= 5:
        print("❌ Weekend - market closed")
        return False
    
    market_open = now.replace(hour=9, minute=15, second=0)
    market_close = now.replace(hour=15, minute=30, second=0)
    is_open = market_open <= now <= market_close
    print(f"🏪 Market open: {is_open}")
    return is_open

def get_live_price_for_screener(symbol):
    print(f"\n💰 Getting price for {symbol}")
    print(f"Angel One connected: {angel_one.is_connected}")
    print(f"Market open: {is_market_open()}")
    
    # Try Angel One
    if angel_one.is_connected and is_market_open():
        try:
            quote = angel_one.get_quote(symbol)
            print(f"Angel One quote: {quote}")
            if quote and quote.get('current_price', 0) > 0:
                print(f"✅ Using Angel One: ₹{quote['current_price']}")
                return {
                    'price': quote['current_price'],
                    'change_percent': quote.get('change_percent', 0),
                    'source': 'angel_one',
                    'is_live': True
                }
        except Exception as e:
            print(f"❌ Angel One failed: {e}")
    
    # Fallback yfinance
    print(f"🔄 Using yfinance fallback")
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period='2d', interval='1d')
        if not hist.empty:
            price = float(hist['Close'].iloc[-1])
            prev = float(hist['Close'].iloc[-2]) if len(hist)>1 else price
            return {
                'price': round(price, 2),
                'change_percent': round(((price-prev)/prev)*100, 2),
                'source': 'yfinance',
                'is_live': False
            }
    except Exception as e:
        print(f"❌ yfinance failed: {e}")
    
    return {'price': 0, 'source': 'unknown', 'is_live': False}

# ---------------------------------------------------------------------------
# Full indicator catalogue – also served by GET /api/screener/indicators
# ---------------------------------------------------------------------------
INDICATOR_CATALOGUE = {
    "price": {
        "category": "Price",
        "indicators": {
            "price":            {"label": "Current Price",           "description": "Last traded price of the stock"},
            "change_percent":   {"label": "Day Change %",            "description": "Percentage change from previous close"},
            "price_vs_ema20":   {"label": "Price − EMA 20",          "description": "Current price minus 20-day EMA (positive = above)"},
            "price_vs_ema50":   {"label": "Price − EMA 50",          "description": "Current price minus 50-day EMA (positive = above)"},
            "price_vs_ema100":  {"label": "Price − EMA 100",         "description": "Current price minus 100-day EMA (positive = above)"},
            "price_vs_ema200":  {"label": "Price − EMA 200",         "description": "Current price minus 200-day EMA (positive = above)"},
        }
    },
    "trend": {
        "category": "Trend",
        "indicators": {
            "ema10":            {"label": "EMA 10",                  "description": "10-period Exponential Moving Average"},
            "ema20":            {"label": "EMA 20",                  "description": "20-period Exponential Moving Average"},
            "ema50":            {"label": "EMA 50",                  "description": "50-period Exponential Moving Average"},
            "ema100":           {"label": "EMA 100",                 "description": "100-period Exponential Moving Average"},
            "ema200":           {"label": "EMA 200",                 "description": "200-period Exponential Moving Average"},
            "ema20_vs_ema50":   {"label": "EMA 20 − EMA 50",        "description": "EMA 20 minus EMA 50 (positive = bullish crossover)"},
            "ema50_vs_ema200":  {"label": "EMA 50 − EMA 200",       "description": "EMA 50 minus EMA 200 (positive = golden cross)"},
            "sma20":            {"label": "SMA 20",                  "description": "20-period Simple Moving Average"},
            "sma50":            {"label": "SMA 50",                  "description": "50-period Simple Moving Average"},
            "sma200":           {"label": "SMA 200",                 "description": "200-period Simple Moving Average"},
        }
    },
    "momentum": {
        "category": "Momentum",
        "indicators": {
            "rsi":              {"label": "RSI (14)",                "description": "Relative Strength Index (14-period). Above 70 = overbought, below 30 = oversold"},
            "macd":             {"label": "MACD",                    "description": "MACD line value (12, 26)"},
            "macd_signal":      {"label": "MACD Signal",             "description": "MACD signal line (9-period EMA of MACD)"},
            "macd_histogram":   {"label": "MACD Histogram",          "description": "Difference between MACD and signal line"},
            "adx":              {"label": "ADX (14)",                "description": "Average Directional Index. Above 25 = strong trend"},
            "stoch_rsi":        {"label": "Stochastic RSI",          "description": "Stochastic RSI %K (14-period). Above 80 = overbought, below 20 = oversold"},
        }
    },
    "volume": {
        "category": "Volume",
        "indicators": {
            "volume":           {"label": "Volume",                  "description": "Today's traded volume"},
            "volume_ratio":     {"label": "Volume Ratio",            "description": "Today's volume divided by 20-day average volume"},
            "obv":              {"label": "OBV",                     "description": "On Balance Volume — cumulative volume flow"},
        }
    },
    "volatility": {
        "category": "Volatility",
        "indicators": {
            "atr":              {"label": "ATR (14)",                "description": "Average True Range (14-period)"},
            "atr_percent":      {"label": "ATR %",                   "description": "ATR as a percentage of current price"},
            "bb_position":      {"label": "BB Position (0–100)",     "description": "Price position within Bollinger Bands (0 = lower, 100 = upper)"},
            "bb_width":         {"label": "BB Width",                "description": "Width of Bollinger Bands as % of middle band"},
        }
    },
    "fundamental": {
        "category": "Fundamental",
        "indicators": {
            "pe_ratio":         {"label": "P/E Ratio",               "description": "Price-to-Earnings ratio (trailing or forward)"},
            "pb_ratio":         {"label": "P/B Ratio",               "description": "Price-to-Book ratio"},
            "roe":              {"label": "Return on Equity %",      "description": "Return on Equity as a percentage"},
            "market_cap":       {"label": "Market Cap (Cr)",         "description": "Market capitalisation in crores"},
            "debt_to_equity":   {"label": "Debt / Equity",           "description": "Debt-to-Equity ratio"},
            "dividend_yield":   {"label": "Dividend Yield %",        "description": "Annual dividend yield as a percentage"},
            "revenue_growth":   {"label": "Revenue Growth %",        "description": "Year-over-year revenue growth percentage"},
            "profit_growth":    {"label": "Profit Growth %",         "description": "Year-over-year earnings growth percentage"},
        }
    },
    "institutional": {
        "category": "Institutional",
        "indicators": {
            "smart_money_score": {"label": "Smart Money Score",      "description": "Institutional activity score (0-100)"},
            "promoter_trend":    {"label": "Promoter Trend",         "description": "Increasing, Decreasing, or Stable"},
            "has_bulk_deal":     {"label": "Has Bulk Buying",        "description": "True if there is a recent bulk buy deal"}
        }
    }
}

FUNDAMENTAL_INDICATORS = set(INDICATOR_CATALOGUE["fundamental"]["indicators"].keys())
INSTITUTIONAL_INDICATORS = set(INDICATOR_CATALOGUE["institutional"]["indicators"].keys())

ALL_INDICATORS = {}
for cat_data in INDICATOR_CATALOGUE.values():
    ALL_INDICATORS.update(cat_data["indicators"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _safe_last(series, idx=-1):
    """Get last (or idx-th) value from a pandas Series, returning None on NaN."""
    if series is None:
        return None
    try:
        val = series.iloc[idx]
    except (IndexError, KeyError):
        return None
    if pd.isna(val) or np.isinf(val):
        return None
    return float(val)


def _compute_technical_values(df):
    """Given a 1-year OHLCV DataFrame for one stock, compute all technical indicator values.
    Returns a dict mapping indicator_name -> current_value (float or None).
    Also returns a 'yesterday' dict for crosses_above / crosses_below operators.
    """
    if df is None or len(df) < 30:
        return None, None

    close = df["Close"]
    high  = df["High"]
    low   = df["Low"]
    vol   = df["Volume"]

    c = _safe_last(close)
    if c is None:
        return None, None

    c_prev = _safe_last(close, -2)

    # EMAs
    ema10  = df.ta.ema(length=10)
    ema20  = df.ta.ema(length=20)
    ema50  = df.ta.ema(length=50)
    ema100 = df.ta.ema(length=100)
    ema200 = df.ta.ema(length=200)

    # SMAs
    sma20  = df.ta.sma(length=20)
    sma50  = df.ta.sma(length=50)
    sma200 = df.ta.sma(length=200)

    # RSI
    rsi_series = df.ta.rsi(length=14)

    # MACD
    macd_df = df.ta.macd(fast=12, slow=26, signal=9)
    macd_val = macd_signal = macd_hist = None
    macd_val_prev = macd_signal_prev = macd_hist_prev = None
    if macd_df is not None and not macd_df.empty:
        macd_val    = _safe_last(macd_df.iloc[:, 0])
        macd_hist   = _safe_last(macd_df.iloc[:, 1])
        macd_signal = _safe_last(macd_df.iloc[:, 2])
        macd_val_prev    = _safe_last(macd_df.iloc[:, 0], -2)
        macd_hist_prev   = _safe_last(macd_df.iloc[:, 1], -2)
        macd_signal_prev = _safe_last(macd_df.iloc[:, 2], -2)

    # ADX
    adx_df = df.ta.adx(length=14)
    adx_val = None
    adx_val_prev = None
    if adx_df is not None and not adx_df.empty:
        adx_val = _safe_last(adx_df.iloc[:, 0])
        adx_val_prev = _safe_last(adx_df.iloc[:, 0], -2)

    # Stochastic RSI
    stoch_df = df.ta.stochrsi(length=14, rsi_length=14, k=5, d=3)
    stoch_k = None
    stoch_k_prev = None
    if stoch_df is not None and not stoch_df.empty:
        stoch_k = _safe_last(stoch_df.iloc[:, 0])
        stoch_k_prev = _safe_last(stoch_df.iloc[:, 0], -2)

    # ATR
    atr_series = df.ta.atr(length=14)

    # Bollinger Bands
    bb_df = df.ta.bbands(length=20, std=2)
    bb_lower = bb_mid = bb_upper = None
    bb_lower_prev = bb_mid_prev = bb_upper_prev = None
    if bb_df is not None and not bb_df.empty:
        bb_lower = _safe_last(bb_df.iloc[:, 0])
        bb_mid   = _safe_last(bb_df.iloc[:, 1])
        bb_upper = _safe_last(bb_df.iloc[:, 2])
        bb_lower_prev = _safe_last(bb_df.iloc[:, 0], -2)
        bb_mid_prev   = _safe_last(bb_df.iloc[:, 1], -2)
        bb_upper_prev = _safe_last(bb_df.iloc[:, 2], -2)

    # OBV
    obv_series = df.ta.obv()

    # Volume ratio
    vol_today = _safe_last(vol)
    vol_avg   = _safe_last(vol.rolling(window=20).mean())
    vol_ratio = (vol_today / vol_avg) if (vol_today and vol_avg and vol_avg > 0) else None

    vol_today_prev = _safe_last(vol, -2)
    vol_avg_prev   = _safe_last(vol.rolling(window=20).mean(), -2)
    vol_ratio_prev = (vol_today_prev / vol_avg_prev) if (vol_today_prev and vol_avg_prev and vol_avg_prev > 0) else None

    # Change %
    change_pct = ((c - c_prev) / c_prev * 100) if c_prev and c_prev != 0 else None

    # BB position (0-100) and width
    bb_pos = None
    bb_pos_prev = None
    bb_w = None
    bb_w_prev = None
    if bb_upper is not None and bb_lower is not None and bb_upper != bb_lower:
        bb_pos = ((c - bb_lower) / (bb_upper - bb_lower)) * 100
    if bb_upper_prev is not None and bb_lower_prev is not None and c_prev and bb_upper_prev != bb_lower_prev:
        bb_pos_prev = ((c_prev - bb_lower_prev) / (bb_upper_prev - bb_lower_prev)) * 100
    if bb_mid is not None and bb_mid != 0 and bb_upper is not None and bb_lower is not None:
        bb_w = ((bb_upper - bb_lower) / bb_mid) * 100
    if bb_mid_prev is not None and bb_mid_prev != 0 and bb_upper_prev is not None and bb_lower_prev is not None:
        bb_w_prev = ((bb_upper_prev - bb_lower_prev) / bb_mid_prev) * 100

    # ATR percent
    atr_val = _safe_last(atr_series)
    atr_pct = (atr_val / c * 100) if (atr_val and c) else None
    atr_val_prev = _safe_last(atr_series, -2)
    atr_pct_prev = (atr_val_prev / c_prev * 100) if (atr_val_prev and c_prev) else None

    # Derived: price vs ema
    def _diff(a, b):
        return (a - b) if (a is not None and b is not None) else None

    today = {
        "price":            c,
        "change_percent":   change_pct,
        "price_vs_ema20":   _diff(c, _safe_last(ema20)),
        "price_vs_ema50":   _diff(c, _safe_last(ema50)),
        "price_vs_ema100":  _diff(c, _safe_last(ema100)),
        "price_vs_ema200":  _diff(c, _safe_last(ema200)),
        "ema10":            _safe_last(ema10),
        "ema20":            _safe_last(ema20),
        "ema50":            _safe_last(ema50),
        "ema100":           _safe_last(ema100),
        "ema200":           _safe_last(ema200),
        "ema20_vs_ema50":   _diff(_safe_last(ema20), _safe_last(ema50)),
        "ema50_vs_ema200":  _diff(_safe_last(ema50), _safe_last(ema200)),
        "sma20":            _safe_last(sma20),
        "sma50":            _safe_last(sma50),
        "sma200":           _safe_last(sma200),
        "rsi":              _safe_last(rsi_series),
        "macd":             macd_val,
        "macd_signal":      macd_signal,
        "macd_histogram":   macd_hist,
        "adx":              adx_val,
        "stoch_rsi":        stoch_k,
        "volume":           vol_today,
        "volume_ratio":     vol_ratio,
        "obv":              _safe_last(obv_series),
        "atr":              atr_val,
        "atr_percent":      atr_pct,
        "bb_position":      bb_pos,
        "bb_width":         bb_w,
    }

    yesterday = {
        "price":            c_prev,
        "change_percent":   None,
        "price_vs_ema20":   _diff(c_prev, _safe_last(ema20, -2)),
        "price_vs_ema50":   _diff(c_prev, _safe_last(ema50, -2)),
        "price_vs_ema100":  _diff(c_prev, _safe_last(ema100, -2)),
        "price_vs_ema200":  _diff(c_prev, _safe_last(ema200, -2)),
        "ema10":            _safe_last(ema10, -2),
        "ema20":            _safe_last(ema20, -2),
        "ema50":            _safe_last(ema50, -2),
        "ema100":           _safe_last(ema100, -2),
        "ema200":           _safe_last(ema200, -2),
        "ema20_vs_ema50":   _diff(_safe_last(ema20, -2), _safe_last(ema50, -2)),
        "ema50_vs_ema200":  _diff(_safe_last(ema50, -2), _safe_last(ema200, -2)),
        "sma20":            _safe_last(sma20, -2),
        "sma50":            _safe_last(sma50, -2),
        "sma200":           _safe_last(sma200, -2),
        "rsi":              _safe_last(rsi_series, -2),
        "macd":             macd_val_prev,
        "macd_signal":      macd_signal_prev,
        "macd_histogram":   macd_hist_prev,
        "adx":              adx_val_prev,
        "stoch_rsi":        stoch_k_prev,
        "volume":           vol_today_prev,
        "volume_ratio":     vol_ratio_prev,
        "obv":              _safe_last(obv_series, -2),
        "atr":              atr_val_prev,
        "atr_percent":      atr_pct_prev,
        "bb_position":      bb_pos_prev,
        "bb_width":         bb_w_prev,
    }

    return today, yesterday


def _fetch_fundamental_values(symbol: str):
    """Fetch fundamental metrics for a single stock via yfinance.
    Returns a dict mapping fundamental indicator names -> values.
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
    except Exception:
        return {}

    def _safe(val):
        if val is None:
            return None
        try:
            f = float(val)
            if np.isnan(f) or np.isinf(f):
                return None
            return f
        except (ValueError, TypeError):
            return None

    pe = _safe(info.get("trailingPE")) or _safe(info.get("forwardPE"))
    pb = _safe(info.get("priceToBook"))
    roe_raw = _safe(info.get("returnOnEquity"))
    roe = roe_raw * 100 if roe_raw is not None else None
    mcap_raw = _safe(info.get("marketCap"))
    mcap = mcap_raw / 1e7 if mcap_raw is not None else None  # Convert to crores
    de_raw = _safe(info.get("debtToEquity"))
    de = de_raw / 100.0 if de_raw is not None else None  # yfinance returns as %
    dy_raw = _safe(info.get("dividendYield"))
    dy = dy_raw * 100 if dy_raw is not None else None
    rev_g_raw = _safe(info.get("revenueGrowth"))
    rev_g = rev_g_raw * 100 if rev_g_raw is not None else None
    profit_g_raw = _safe(info.get("earningsGrowth"))
    profit_g = profit_g_raw * 100 if profit_g_raw is not None else None

    return {
        "pe_ratio":         pe,
        "pb_ratio":         pb,
        "roe":              roe,
        "market_cap":       mcap,
        "debt_to_equity":   de,
        "dividend_yield":   dy,
        "revenue_growth":   rev_g,
        "profit_growth":    profit_g,
    }


# ---------------------------------------------------------------------------
# Condition evaluation
# ---------------------------------------------------------------------------
def _evaluate_condition(condition: dict, today_vals: dict, yesterday_vals: dict) -> bool:
    """Return True if a single condition passes."""
    indicator = condition.get("indicator", "")
    operator  = condition.get("operator", "greater_than")
    threshold = condition.get("value")
    threshold2 = condition.get("value2")

    current = today_vals.get(indicator)
    if current is None:
        return False

    if operator == "greater_than":
        return current > threshold if threshold is not None else False
    elif operator == "less_than":
        return current < threshold if threshold is not None else False
    elif operator == "equal_to":
        if isinstance(current, str) or isinstance(threshold, str):
            return str(current).lower() == str(threshold).lower() if threshold is not None else False
        if isinstance(current, bool) or isinstance(threshold, bool):
            # Parse 'true'/'false' strings to boolean if necessary
            if isinstance(threshold, str):
                threshold = threshold.lower() in ['true', '1', 't', 'y', 'yes']
            return bool(current) == bool(threshold) if threshold is not None else False
        try:
            return abs(float(current) - float(threshold)) < 1e-6 if threshold is not None else False
        except (ValueError, TypeError):
            return False
    elif operator == "between":
        if threshold is None or threshold2 is None:
            return False
        lo, hi = min(threshold, threshold2), max(threshold, threshold2)
        return lo <= current <= hi
    elif operator == "crosses_above":
        prev = yesterday_vals.get(indicator)
        if prev is None or threshold is None:
            return False
        return current > threshold and prev <= threshold
    elif operator == "crosses_below":
        prev = yesterday_vals.get(indicator)
        if prev is None or threshold is None:
            return False
        return current < threshold and prev >= threshold
    return False


# ---------------------------------------------------------------------------
# Main screener engine
# ---------------------------------------------------------------------------
class ScreenerEngine:
    @staticmethod
    def load_universe():
        import json
        import os
        
        try:
            json_path = os.path.join(
                os.path.dirname(__file__),
                '..', 'data', 'nse_stocks.json'
            )
            with open(json_path, 'r') as f:
                data = json.load(f)
            
            symbols = []
            for stock in data:
                sym = stock.get('symbol', '')
                if not sym:
                    continue
                sym = sym.strip()
                if not sym.endswith('.NS') and not sym.endswith('.BO'):
                    sym = sym + '.NS'
                stock['symbol'] = sym
                symbols.append(stock)
            
            print(f"[INFO] Universe: {len(symbols)} stocks")
            return symbols
            
        except Exception as e:
            print(f"[WARN] nse_stocks.json error: {e}")
            from services.market_data import NIFTY_50_SYMBOLS
            return [{"symbol": s} for s in NIFTY_50_SYMBOLS]

    @staticmethod
    async def run(conditions: list, sort_by: str = "score", sort_order: str = "desc", limit: int = 20):
        start_time = time.time()
        stocks = ScreenerEngine.load_universe()
        if not stocks:
            return {"error": "Stock universe empty", "results": [], "summary": {}}

        total_screened = len(stocks)
        symbols = [s["symbol"] for s in stocks]
        symbol_meta = {s["symbol"]: s for s in stocks}

        # Split conditions into technical, fundamental, institutional
        tech_conditions  = [c for c in conditions if c.get("indicator") not in FUNDAMENTAL_INDICATORS and c.get("indicator") not in INSTITUTIONAL_INDICATORS]
        fund_conditions  = [c for c in conditions if c.get("indicator") in FUNDAMENTAL_INDICATORS]
        inst_conditions  = [c for c in conditions if c.get("indicator") in INSTITUTIONAL_INDICATORS]

        # ---- Step 1: Bulk download historical data ----
        def fetch_data():
            return yf.download(
                tickers=symbols,
                period="1y",
                group_by="ticker",
                threads=True,
                progress=False
            )

        df_all = await asyncio.to_thread(fetch_data)

        # ---- Step 2: Evaluate technical conditions per stock ----
        tech_passed = []
        for sym in symbols:
            try:
                stock_df = df_all[sym] if len(symbols) > 1 else df_all
                stock_df = stock_df.dropna(subset=["Close"])
                if len(stock_df) < 50:
                    continue

                today_vals, yesterday_vals = _compute_technical_values(stock_df)
                if today_vals is None:
                    continue

                # Check all technical conditions
                passed = all(_evaluate_condition(c, today_vals, yesterday_vals) for c in tech_conditions)
                if not passed:
                    continue

                tech_passed.append({
                    "symbol": sym,
                    "meta": symbol_meta[sym],
                    "today": today_vals,
                    "yesterday": yesterday_vals,
                })
            except Exception:
                continue

        # ---- Step 3: Evaluate fundamental conditions (only for tech-passed stocks) ----
        async def _process_fundamentals(item):
            if not fund_conditions:
                return item

            fund_vals = await asyncio.to_thread(_fetch_fundamental_values, item["symbol"])
            # Merge into today values
            item["today"].update(fund_vals)

            passed = all(_evaluate_condition(c, item["today"], item.get("yesterday", {})) for c in fund_conditions)
            return item if passed else None

        tasks = [_process_fundamentals(item) for item in tech_passed]
        results = await asyncio.gather(*tasks)
        final_items = [r for r in results if r is not None]

        # ---- Step 3.5: Evaluate institutional conditions ----
        async def _process_institutional(item):
            if not inst_conditions:
                return item
                
            from services.institutional_service import get_institutional_data
            try:
                inst_data = await asyncio.to_thread(get_institutional_data, item["symbol"])
                
                sms = inst_data.get('smart_money_score', 0)
                pt = inst_data.get('promoter_activity', {}).get('trend', 'Stable')
                bulk = inst_data.get('bulk_deals', [])
                has_bulk_buying = any('buy' in str(d.get('buy_sell','')).lower() for d in bulk[:3])
                
                item["today"]["smart_money_score"] = sms
                item["today"]["promoter_trend"] = pt
                item["today"]["has_bulk_deal"] = has_bulk_buying
                item["today"]["has_bulk_buying"] = has_bulk_buying
            except Exception as e:
                logger.error(f"Error fetching institutional data for {item['symbol']}: {e}")
                item["today"]["smart_money_score"] = 50
                item["today"]["promoter_trend"] = "Stable"
                item["today"]["has_bulk_deal"] = False
                item["today"]["has_bulk_buying"] = False
                
            passed = all(_evaluate_condition(c, item["today"], item.get("yesterday", {})) for c in inst_conditions)
            return item if passed else None

        inst_tasks = [_process_institutional(item) for item in final_items]
        inst_results = await asyncio.gather(*inst_tasks)
        final_items = [r for r in inst_results if r is not None]

        # ---- Step 4: Compute a simple composite score ----
        for item in final_items:
            t = item["today"]
            score = 50
            rsi = t.get("rsi")
            if rsi is not None:
                if 40 <= rsi <= 60:
                    score += 5
                elif rsi > 70:
                    score -= 10
                elif rsi < 30:
                    score += 10
            if t.get("price_vs_ema200") is not None and t["price_vs_ema200"] > 0:
                score += 10
            adx = t.get("adx")
            if adx is not None:
                if adx > 30:
                    score += 10
                elif adx > 20:
                    score += 5
            vol_r = t.get("volume_ratio")
            if vol_r is not None and vol_r > 1.5:
                score += 10
            item["score"] = max(0, min(100, score))

        # ---- Step 5: Sort ----
        def _sort_key(item):
            if sort_by == "score":
                return item.get("score", 0)
            return item["today"].get(sort_by) or 0

        reverse = sort_order.lower() != "asc"
        final_items.sort(key=_sort_key, reverse=reverse)

        # ---- Step 6: Build output ----
        output = []
        market_open = is_market_open()
        for rank, item in enumerate(final_items[:limit], 1):
            t = item["today"]
            sym = item["symbol"]
            
            live_price = get_live_price_for_screener(sym)
                
            row = {
                "rank":             rank,
                "symbol":           sym,
                "name":             item["meta"].get("name", sym),
                "sector":           item["meta"].get("sector", ""),
                "price":            round(t.get("price") or 0, 2),
                "live_price":       live_price.get('price'),
                "price_source":     live_price.get('source'),
                "change_percent":   round(live_price.get('change_percent') if live_price.get('source') == 'angel_one' else (t.get("change_percent") or 0), 2),
                "is_live":          live_price.get('is_live', False),
                "score":            item.get("score", 0),
            }
            # Attach every indicator value that was used in conditions (+ sort_by)
            used_indicators = set(c.get("indicator") for c in conditions)
            if sort_by and sort_by != "score":
                used_indicators.add(sort_by)
            for ind in used_indicators:
                v = t.get(ind)
                row[ind] = round(v, 4) if v is not None else None

            output.append(row)

        elapsed = round(time.time() - start_time, 2)
        return {
            "results": output,
            "summary": {
                "total_screened":   total_screened,
                "total_passed":     len(final_items),
                "elapsed_seconds":  elapsed,
            }
        }


# ---------------------------------------------------------------------------
# Keep the scheduler for backwards compatibility (runs an empty default screen)
# ---------------------------------------------------------------------------
def setup_scheduler():
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    # Lightweight placeholder – no longer auto-runs the old swing screener
    async def _noop():
        pass

    scheduler.add_job(_noop, "cron", day_of_week="mon-fri", hour=9, minute=30)
    scheduler.add_job(_noop, "cron", day_of_week="mon-fri", hour=15, minute=30)

    scheduler.start()
    logger.info("APScheduler initialized (screener scheduler placeholder)")
