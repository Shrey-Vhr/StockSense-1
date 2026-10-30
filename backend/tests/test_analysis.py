"""Tests for the analysis logic: indicators, candlestick and chart patterns,
trade setups and screener conditions.

Everything runs on synthetic OHLCV frames built here, so no test touches the
network. Where a number can be worked out by hand (RSI, risk/reward,
support/resistance), the test states the hand-computed value rather than
re-running the implementation's own formula.
"""
import numpy as np
import pandas as pd
import pytest

from services.technical_analysis import TechnicalAnalysisService as TA
from services import pattern_service as ps
from services.screener_service import _compute_technical_values, _evaluate_condition


def frame(closes, opens=None, highs=None, lows=None, volumes=None):
    """OHLCV DataFrame in yfinance's shape (capitalised columns, daily index)."""
    closes = np.asarray(closes, dtype=float)
    n = len(closes)
    opens = closes if opens is None else np.asarray(opens, dtype=float)
    highs = np.maximum(opens, closes) + 0.5 if highs is None else np.asarray(highs, dtype=float)
    lows = np.minimum(opens, closes) - 0.5 if lows is None else np.asarray(lows, dtype=float)
    volumes = np.full(n, 1_000_000.0) if volumes is None else np.asarray(volumes, dtype=float)
    idx = pd.date_range("2025-01-01", periods=n, freq="D")
    return pd.DataFrame({"Open": opens, "High": highs, "Low": lows,
                         "Close": closes, "Volume": volumes}, index=idx)


def trend(start, step, n=260):
    return [start + step * i for i in range(n)]


# ── RSI ────────────────────────────────────────────────────────────────────
# Wilder's worked example (the series StockCharts uses to explain RSI).
WILDER = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
          45.89, 46.03, 45.61, 46.28, 46.28, 46.00]


def test_rsi_matches_wilder_by_hand():
    # First 14 changes: gains sum 3.34, losses sum 1.40.
    # avg gain 3.34/14, avg loss 0.10 -> RS 2.3857 -> RSI 70.46
    assert TA.calculate_rsi(frame(WILDER[:15]))["value"] == pytest.approx(70.46, abs=0.01)
    # Next change is -0.28: gain (0.238571*13)/14, loss (0.10*13+0.28)/14 -> RSI 66.25
    assert TA.calculate_rsi(frame(WILDER[:16]))["value"] == pytest.approx(66.25, abs=0.01)


def test_rsi_signals():
    assert TA.calculate_rsi(frame(trend(100, 1, 40)))["signal"] == "Overbought"
    assert TA.calculate_rsi(frame(trend(200, -1, 40)))["signal"] == "Oversold"
    assert TA.calculate_rsi(frame(WILDER[:10])) == {"value": None, "signal": "Neutral"}


def test_rsi_of_a_flat_series_is_neutral():
    # No gains and no losses: there is no momentum either way. This used to
    # return 0 and call a suspended stock "Oversold".
    rsi = TA.calculate_rsi(frame([100.0] * 30))
    assert rsi["value"] == pytest.approx(50.0)
    assert rsi["signal"] == "Neutral"


# ── Trend, structure, levels ───────────────────────────────────────────────

def test_detect_trend():
    assert TA.detect_trend(frame(trend(100, 1))) == "Strong Uptrend"
    assert TA.detect_trend(frame(trend(400, -1))) == "Strong Downtrend"
    # Too short for an EMA 200: no claim either way.
    assert TA.detect_trend(frame(trend(100, 1, 120))) == "Sideways"


def test_market_structure():
    assert TA.detect_market_structure(frame(trend(100, 1, 30))) == "Higher Highs, Higher Lows (Uptrend)"
    assert TA.detect_market_structure(frame(trend(200, -1, 30))) == "Lower Highs, Lower Lows (Downtrend)"
    assert TA.detect_market_structure(frame(trend(100, 1, 10))) == "Neutral"


def test_support_resistance_uses_the_last_window():
    closes = [100.0] * 40
    lows = [99.0] * 40
    highs = [101.0] * 40
    lows[-5], highs[-8] = 95.0, 110.0      # inside the last 20 bars
    lows[5], highs[6] = 50.0, 200.0        # outside it: must be ignored
    sr = TA.find_support_resistance(frame(closes, highs=highs, lows=lows))
    assert sr == {"support": 95.0, "resistance": 110.0}


def test_bollinger_position():
    closes = [100.0 + (0.5 if i % 2 else -0.5) for i in range(40)]
    assert TA.calculate_bollinger_bands(frame(closes + [130.0]))["position"] == "Above Upper Band"
    assert TA.calculate_bollinger_bands(frame(closes + [70.0]))["position"] == "Below Lower Band"
    bb = TA.calculate_bollinger_bands(frame(closes[:10]))
    assert bb["position"] == "Neutral" and bb["upper"] is None


def test_relative_volume_compares_today_with_prior_average():
    vols = [1_000_000.0] * 25 + [3_000_000.0]
    assert TA.calculate_relative_volume(frame([100.0] * 26, volumes=vols)) == pytest.approx(3.0)


def test_macd_crossovers_alternate_on_a_cycle():
    # A sine wave turns every half-cycle, so the histogram changes sign and
    # crossovers must alternate bearish/bullish.
    closes = [100 + 10 * np.sin(i / 6) for i in range(120)]
    seen = [TA.calculate_macd(frame(closes[:end]))["crossover"] for end in range(40, 121)]
    crosses = [c for c in seen if c != "Neutral"]
    assert len(crosses) >= 3
    assert all(a != b for a, b in zip(crosses, crosses[1:]))
    assert TA.calculate_macd(frame(trend(100, 1, 20)))["macd"] is None


# ── Candlestick patterns ───────────────────────────────────────────────────

def candles(rows):
    """rows of (open, high, low, close)."""
    o, h, l, c = zip(*rows)
    return frame(c, opens=o, highs=h, lows=l)


def names(df):
    return {p["name"] for p in ps.detect_candlestick_patterns(df)}


def test_bullish_and_bearish_engulfing():
    bull = candles([(100, 101, 99, 100), (105, 106, 99, 100), (99, 108, 98, 107)])
    assert "Bullish Engulfing" in names(bull)
    bear = candles([(100, 101, 99, 100), (100, 106, 99, 105), (106, 107, 97, 98)])
    assert "Bearish Engulfing" in names(bear)


def test_hammer_shooting_star_and_doji():
    hammer = candles([(100, 101, 99, 100), (100, 101, 99, 100), (100, 101.2, 94, 101)])
    assert "Hammer" in names(hammer)
    star = candles([(100, 101, 99, 100), (100, 101, 99, 100), (101, 108, 99.8, 100)])
    assert "Shooting Star" in names(star)
    doji = candles([(100, 101, 99, 100), (100, 101, 99, 100), (100, 104, 96, 100.2)])
    assert "Doji" in names(doji)


def test_morning_star():
    df = candles([(100, 101, 99, 100), (110, 111, 99, 100), (99, 100, 98, 99.5), (100, 109, 99, 108)])
    assert "Morning Star" in names(df)


def test_quiet_candles_have_no_reversal_patterns():
    # Same-direction bodies of equal size: no engulfing, harami, star or hammer.
    df = candles([(100 + i, 102 + i, 99.5 + i, 101.5 + i) for i in range(6)])
    found = names(df)
    assert not found & {"Bullish Engulfing", "Bearish Engulfing", "Hammer",
                        "Shooting Star", "Morning Star", "Evening Star"}
    assert ps.detect_candlestick_patterns(candles([(1, 2, 0.5, 1.5)] * 2)) == []


# ── Chart patterns ─────────────────────────────────────────────────────────

def test_find_peaks_and_troughs():
    prices = [1, 2, 3, 4, 5, 9, 5, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5]
    peaks, troughs = ps.find_peaks_troughs(prices)
    assert peaks == [(5, 9)]
    assert troughs == [(11, 0)]


def test_double_top():
    up = list(np.linspace(100, 120, 10))
    down = list(np.linspace(119, 105, 8))
    highs = up + down + list(np.linspace(106, 120.5, 8)) + list(np.linspace(119, 100, 10))
    closes = pd.Series(highs) - 1
    dates = pd.date_range("2025-01-01", periods=len(highs), freq="D")
    [top] = ps.detect_double_top(pd.Series(highs), closes, dates)
    assert top["name"] == "Double Top" and top["type"] == "bearish"
    assert top["peak1_price"] == pytest.approx(120, abs=0.6)
    assert top["peak2_price"] == pytest.approx(120.5, abs=0.6)
    # Target = valley - (average peak - valley)
    avg_peak = (top["peak1_price"] + top["peak2_price"]) / 2
    assert top["target"] == pytest.approx(top["valley_price"] - (avg_peak - top["valley_price"]), abs=0.02)


def test_double_top_rejects_unequal_peaks():
    highs = (list(np.linspace(100, 120, 10)) + list(np.linspace(119, 105, 8))
             + list(np.linspace(106, 135, 8)) + list(np.linspace(134, 100, 10)))
    dates = pd.date_range("2025-01-01", periods=len(highs), freq="D")
    assert ps.detect_double_top(pd.Series(highs), pd.Series(highs), dates) == []


# ── Trade setup ────────────────────────────────────────────────────────────

def test_bullish_trade_setup_levels():
    setup = ps.calculate_trade_setup(
        [{"type": "bullish", "confidence": 70}],
        current_price=100, support=95, resistance=110, rsi=50, trend="Sideways",
    )
    assert setup["bias"] == "Bullish"
    assert setup["entry"] == 100
    assert setup["stop_loss"] == 94.05              # 1% under support
    assert setup["target1"] == pytest.approx(100 + 5.95 * 1.5, abs=0.01)
    assert setup["target2"] == pytest.approx(100 + 5.95 * 2.5, abs=0.01)
    assert setup["risk_reward"] == 1.5


def test_bearish_trade_setup_levels():
    setup = ps.calculate_trade_setup(
        [{"type": "bearish", "confidence": 70}],
        current_price=100, support=90, resistance=104, rsi=50, trend="Sideways",
    )
    assert setup["bias"] == "Bearish"
    assert setup["stop_loss"] == 105.04            # 1% over resistance
    assert setup["target1"] < setup["entry"] < setup["stop_loss"]


def test_trade_setup_confidence_adjustments():
    base = dict(current_price=100, support=95, resistance=110)
    pat = [{"type": "bullish", "confidence": 70}]
    plain = ps.calculate_trade_setup(pat, rsi=50, trend="Sideways", **base)["confidence"]
    assert ps.calculate_trade_setup(pat, rsi=35, trend="Sideways", **base)["confidence"] == plain + 10
    assert ps.calculate_trade_setup(pat, rsi=75, trend="Sideways", **base)["confidence"] == plain - 15
    assert ps.calculate_trade_setup(pat, rsi=50, trend="Strong Uptrend", **base)["confidence"] == plain + 8
    assert ps.calculate_trade_setup([], rsi=50, trend="", **base) == {}


# ── Screener ───────────────────────────────────────────────────────────────

def test_condition_operators():
    today = {"rsi": 55.0, "price_vs_ema50": 2.0, "promoter_trend": "Increasing", "has_bulk_deal": True}
    yday = {"rsi": 48.0, "price_vs_ema50": -1.0}

    def ok(**cond):
        return _evaluate_condition(cond, today, yday)

    assert ok(indicator="rsi", operator="greater_than", value=50)
    assert not ok(indicator="rsi", operator="less_than", value=50)
    assert ok(indicator="rsi", operator="between", value=60, value2=50)  # order-insensitive
    assert ok(indicator="rsi", operator="crosses_above", value=50)
    assert not ok(indicator="rsi", operator="crosses_below", value=50)
    assert ok(indicator="price_vs_ema50", operator="crosses_above", value=0)
    assert ok(indicator="promoter_trend", operator="equal_to", value="increasing")
    assert ok(indicator="has_bulk_deal", operator="equal_to", value=True)
    assert not ok(indicator="missing", operator="greater_than", value=0)
    assert not ok(indicator="rsi", operator="greater_than", value=None)
    assert not ok(indicator="rsi", operator="no_such_operator", value=1)


def test_condition_with_mismatched_types_fails_instead_of_raising():
    # The API accepts text thresholds (equal_to needs them), and some
    # indicators are text. A numeric comparison across the two used to raise
    # TypeError, which in the fundamental and institutional steps failed the
    # whole screener run rather than just that condition.
    today = {"rsi": 55.0, "promoter_trend": "Stable"}
    assert _evaluate_condition({"indicator": "promoter_trend", "operator": "greater_than", "value": 5}, today, {}) is False
    assert _evaluate_condition({"indicator": "rsi", "operator": "between", "value": "a", "value2": 60}, today, {}) is False
    # A numeric string is still a number.
    assert _evaluate_condition({"indicator": "rsi", "operator": "greater_than", "value": "50"}, today, {}) is True


def test_compute_technical_values():
    closes = trend(100, 0.5, 260)
    vols = [1_000_000.0] * 259 + [2_500_000.0]
    today, yday = _compute_technical_values(frame(closes, volumes=vols))
    assert today["price"] == closes[-1] and yday["price"] == closes[-2]
    assert today["change_percent"] == pytest.approx((closes[-1] - closes[-2]) / closes[-2] * 100)
    assert today["price_vs_ema200"] > 0 and today["ema20_vs_ema50"] > 0
    assert today["rsi"] > 70
    assert today["volume_ratio"] > 2
    assert _compute_technical_values(frame(closes[:20])) == (None, None)
