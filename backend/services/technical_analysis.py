import pandas as pd
import numpy as np
import pandas_ta as ta
import yfinance as yf
import math
import asyncio

class TechnicalAnalysisService:
    @staticmethod
    def _safe_get(arr, idx=-1, default=None):
        if arr is None: return default
        try:
            val = arr.iloc[idx] if isinstance(arr, pd.Series) else arr[idx]
        except (IndexError, TypeError, KeyError, AttributeError):
            try:
                val = arr[idx]
            except Exception:
                return default
        
        if pd.isna(val) or np.isinf(val):
            return default
        return float(val)

    @staticmethod
    def calculate_emas(df):
        if len(df) == 0: return {}
        return {
            "ema10": TechnicalAnalysisService._safe_get(df.ta.ema(length=10)),
            "ema20": TechnicalAnalysisService._safe_get(df.ta.ema(length=20)),
            "ema50": TechnicalAnalysisService._safe_get(df.ta.ema(length=50)),
            "ema100": TechnicalAnalysisService._safe_get(df.ta.ema(length=100)),
            "ema200": TechnicalAnalysisService._safe_get(df.ta.ema(length=200))
        }

    @staticmethod
    def calculate_smas(df):
        if len(df) == 0: return {}
        return {
            "sma20": TechnicalAnalysisService._safe_get(df.ta.sma(length=20)),
            "sma50": TechnicalAnalysisService._safe_get(df.ta.sma(length=50)),
            "sma200": TechnicalAnalysisService._safe_get(df.ta.sma(length=200))
        }

    @staticmethod
    def detect_trend(df):
        emas = TechnicalAnalysisService.calculate_emas(df)
        close_val = TechnicalAnalysisService._safe_get(df['Close'].values)
        if close_val is None or not all(emas.values()):
            return "Sideways"

        e20, e50, e100, e200 = emas['ema20'], emas['ema50'], emas['ema100'], emas['ema200']
        
        if e20 > e50 > e100 > e200:
            return "Strong Uptrend"
        elif close_val > e50 and e50 > e200:
            return "Uptrend"
        elif e20 < e50 < e100 < e200:
            return "Strong Downtrend"
        elif close_val < e50 and e50 < e200:
            return "Downtrend"
        
        return "Sideways"

    @staticmethod
    def calculate_rsi(df, period=14):
        if len(df) < period + 1: return {"value": None, "signal": "Neutral"}
        
        closes = df['Close']
        delta = closes.diff()
        
        # Separate gains and losses
        gains = delta.where(delta > 0, 0.0)
        losses = -delta.where(delta < 0, 0.0)
        
        # First average using simple mean (seed value)
        avg_gain = gains.iloc[:period].mean()
        avg_loss = losses.iloc[:period].mean()
        
        # Wilder's smoothing (same as TradingView)
        wilder_gains = [avg_gain]
        wilder_losses = [avg_loss]
        
        for i in range(period, len(closes)):
            avg_gain = (wilder_gains[-1] * (period-1) + gains.iloc[i]) / period
            avg_loss = (wilder_losses[-1] * (period-1) + losses.iloc[i]) / period
            wilder_gains.append(avg_gain)
            wilder_losses.append(avg_loss)
        
        # Calculate RSI
        avg_gain_series = pd.Series(wilder_gains)
        avg_loss_series = pd.Series(wilder_losses)
        
        rs = avg_gain_series / avg_loss_series.replace(0, 0.001)
        rsi = 100 - (100 / (1 + rs))
        
        rsi_val = float(rsi.iloc[-1])
        if pd.isna(rsi_val): return {"value": None, "signal": "Neutral"}
        
        signal = "Neutral"
        if rsi_val > 70: signal = "Overbought"
        elif rsi_val < 30: signal = "Oversold"
        
        return {"value": rsi_val, "signal": signal}

    @staticmethod
    def calculate_macd(df):
        if len(df) < 34: return {"macd": None, "signal": None, "hist": None, "crossover": "Neutral"}
        macd_df = df.ta.macd(fast=12, slow=26, signal=9)
        if macd_df is None or macd_df.empty: return {"macd": None, "signal": None, "hist": None, "crossover": "Neutral"}
        
        m_val = TechnicalAnalysisService._safe_get(macd_df.iloc[:, 0])
        h_val = TechnicalAnalysisService._safe_get(macd_df.iloc[:, 1])
        s_val = TechnicalAnalysisService._safe_get(macd_df.iloc[:, 2])
        
        cross = "Neutral"
        if h_val is not None:
            prev_h = TechnicalAnalysisService._safe_get(macd_df.iloc[:, 1], -2)
            if prev_h is not None and prev_h < 0 and h_val > 0:
                cross = "Bullish Crossover"
            elif prev_h is not None and prev_h > 0 and h_val < 0:
                cross = "Bearish Crossover"

        return {"macd": m_val, "signal": s_val, "hist": h_val, "crossover": cross}

    @staticmethod
    def calculate_adx(df, period=14):
        if len(df) < period * 2: return {"value": None, "strength": "Weak"}
        adx_df = df.ta.adx(length=period)
        if adx_df is None or adx_df.empty: return {"value": None, "strength": "Weak"}
        
        adx_val = TechnicalAnalysisService._safe_get(adx_df.iloc[:, 0])
        if adx_val is None: return {"value": None, "strength": "Weak"}
        
        strength = "Weak"
        if adx_val > 50: strength = "Very Strong"
        elif adx_val > 25: strength = "Strong"
        elif adx_val > 20: strength = "Moderate"
        
        return {"value": adx_val, "strength": strength}

    @staticmethod
    def calculate_stoch_rsi(df, timeperiod=14):
        if len(df) < timeperiod + 5: return {"fastk": None, "fastd": None}
        try:
            stoch_df = df.ta.stochrsi(length=timeperiod, rsi_length=timeperiod, k=5, d=3)
            if stoch_df is None or stoch_df.empty: return {"fastk": None, "fastd": None}
            return {
                "fastk": TechnicalAnalysisService._safe_get(stoch_df.iloc[:, 0]),
                "fastd": TechnicalAnalysisService._safe_get(stoch_df.iloc[:, 1])
            }
        except Exception:
            return {"fastk": None, "fastd": None}

    @staticmethod
    def calculate_obv(df):
        if len(df) == 0: return {"value": None, "trend": "Neutral"}
        obv = df.ta.obv()
        obv_val = TechnicalAnalysisService._safe_get(obv)
        
        try:
            obv_sma = obv.rolling(window=20).mean()
            obv_sma_val = TechnicalAnalysisService._safe_get(obv_sma)
            trend = "Neutral"
            if obv_val and obv_sma_val:
                if obv_val > obv_sma_val: trend = "Up"
                else: trend = "Down"
        except:
            trend = "Neutral"
            
        return {"value": obv_val, "trend": trend}

    @staticmethod
    def calculate_vwap(df):
        if len(df) < 20: return None
        try:
            tp = (df['High'] + df['Low'] + df['Close']) / 3
            vol = df['Volume']
            rolling_tp_vol = (tp * vol).rolling(window=20).sum()
            rolling_vol = vol.rolling(window=20).sum()
            vwap = rolling_tp_vol / rolling_vol
            return TechnicalAnalysisService._safe_get(vwap.values)
        except:
            return None

    @staticmethod
    def calculate_relative_volume(df, period=20):
        if len(df) < period: return None
        try:
            vol = df['Volume'].values
            current_vol = vol[-1]
            avg_vol = np.nanmean(vol[-period-1:-1])
            if avg_vol == 0: return 1.0
            return float(current_vol / avg_vol)
        except:
            return None

    @staticmethod
    def calculate_atr(df, period=14):
        if len(df) < period + 1: return None
        return TechnicalAnalysisService._safe_get(df.ta.atr(length=period))

    @staticmethod
    def calculate_bollinger_bands(df, timeperiod=20, nbdevup=2, nbdevdn=2):
        if len(df) < timeperiod: return {"upper": None, "middle": None, "lower": None, "position": "Neutral"}
        bb_df = df.ta.bbands(length=timeperiod, std=nbdevup)
        if bb_df is None or bb_df.empty: return {"upper": None, "middle": None, "lower": None, "position": "Neutral"}
        
        l_val = TechnicalAnalysisService._safe_get(bb_df.iloc[:, 0])
        m_val = TechnicalAnalysisService._safe_get(bb_df.iloc[:, 1])
        u_val = TechnicalAnalysisService._safe_get(bb_df.iloc[:, 2])
        close = TechnicalAnalysisService._safe_get(df['Close'].values)
        
        pos = "Neutral"
        if close and u_val and l_val:
            if close > u_val: pos = "Above Upper Band"
            elif close < l_val: pos = "Below Lower Band"
            elif close > m_val: pos = "Above Middle Band"
            else: pos = "Below Middle Band"
            
        return {"upper": u_val, "middle": m_val, "lower": l_val, "position": pos}

    @staticmethod
    def detect_market_structure(df, lookback=20):
        if len(df) < lookback: return "Neutral"
        try:
            highs = df['High'].values
            lows = df['Low'].values
            recent_high = np.max(highs[-5:])
            prev_high = np.max(highs[-20:-5])
            recent_low = np.min(lows[-5:])
            prev_low = np.min(lows[-20:-5])
            
            if recent_high > prev_high and recent_low > prev_low:
                return "Higher Highs, Higher Lows (Uptrend)"
            elif recent_high < prev_high and recent_low < prev_low:
                return "Lower Highs, Lower Lows (Downtrend)"
            return "Consolidation"
        except:
            return "Neutral"

    @staticmethod
    def find_support_resistance(df, window=20):
        try:
            if df is None or len(df) < window:
                return {'support': None, 'resistance': None}
            
            recent = df.tail(60)
            support = float(recent['Low'].min())
            resistance = float(recent['High'].max())
            
            # More precise S/R using rolling windows
            rolling_low = df['Low'].rolling(window=window).min()
            rolling_high = df['High'].rolling(window=window).max()
            
            recent_support = float(rolling_low.iloc[-1])
            recent_resistance = float(rolling_high.iloc[-1])
            
            import math
            if math.isnan(recent_support):
                recent_support = support
            if math.isnan(recent_resistance):
                recent_resistance = resistance
            
            return {
                'support': round(recent_support, 2),
                'resistance': round(recent_resistance, 2)
            }
        except Exception as e:
            print(f"S/R error: {e}")
            return {'support': None, 'resistance': None}

    @staticmethod
    def detect_candlestick_patterns(df):
        if len(df) < 5: return []
        patterns = []
        
        try:
            cdl_names = ["hammer", "invertedhammer", "engulfing", "morningstar", "eveningstar", "doji", "shootingstar", "marubozu", "harami"]
            cdl_df = df.ta.cdl_pattern(name=cdl_names)
            if cdl_df is None or cdl_df.empty: return []

            cdl_map = {
                "CDL_HAMMER": ("Hammer", "Bullish"),
                "CDL_INVERTEDHAMMER": ("Inverted Hammer", "Bullish"),
                "CDL_ENGULFING": ("Bullish Engulfing", "Varies"),
                "CDL_MORNINGSTAR": ("Morning Star", "Bullish"),
                "CDL_EVENINGSTAR": ("Evening Star", "Bearish"),
                "CDL_DOJI_10_0.1": ("Doji", "Neutral"),
                "CDL_SHOOTINGSTAR": ("Shooting Star", "Bearish"),
                "CDL_MARUBOZU": ("Marubozu", "Varies"),
                "CDL_HARAMI": ("Harami", "Varies")
            }
            
            for idx in [-1, -2, -3]:
                if len(cdl_df) < abs(idx): continue
                for col in cdl_df.columns:
                    mapped_name = None
                    mapped_signal = None
                    for key, (name, default_signal) in cdl_map.items():
                        if key in col:
                            mapped_name = name
                            mapped_signal = default_signal
                            break
                    
                    if mapped_name is None:
                        continue
                        
                    val = cdl_df[col].iloc[idx]
                    if val != 0:
                        sig = mapped_signal
                        if mapped_name in ["Bullish Engulfing", "Marubozu", "Harami"]:
                            sig = "Bullish" if val > 0 else "Bearish"
                        
                        if not any(p['name'] == mapped_name for p in patterns):
                            patterns.append({
                                "name": mapped_name,
                                "signal": sig,
                                "reliability": "Moderate",
                                "days_ago": abs(idx) - 1
                            })
        except Exception:
            pass
            
        return patterns

    @staticmethod
    def calculate_relative_strength(stock_df):
        try:
            nifty = yf.Ticker("^NSEI")
            nifty_df = nifty.history(period="2mo", interval="1d")
            
            if len(stock_df) < 21 or len(nifty_df) < 21:
                return {"rs_5_day": None, "rs_20_day": None}
                
            stock_current = TechnicalAnalysisService._safe_get(stock_df['Close'].values, -1)
            stock_5d = TechnicalAnalysisService._safe_get(stock_df['Close'].values, -6)
            stock_20d = TechnicalAnalysisService._safe_get(stock_df['Close'].values, -21)
            
            nifty_current = TechnicalAnalysisService._safe_get(nifty_df['Close'].values, -1)
            nifty_5d = TechnicalAnalysisService._safe_get(nifty_df['Close'].values, -6)
            nifty_20d = TechnicalAnalysisService._safe_get(nifty_df['Close'].values, -21)
            
            if not all([stock_current, stock_5d, stock_20d, nifty_current, nifty_5d, nifty_20d]):
                return {"rs_5_day": None, "rs_20_day": None}
                
            stock_5d_ret = ((stock_current - stock_5d) / stock_5d) * 100
            nifty_5d_ret = ((nifty_current - nifty_5d) / nifty_5d) * 100
            
            stock_20d_ret = ((stock_current - stock_20d) / stock_20d) * 100
            nifty_20d_ret = ((nifty_current - nifty_20d) / nifty_20d) * 100
            
            return {
                "rs_5_day": round(stock_5d_ret - nifty_5d_ret, 2),
                "rs_20_day": round(stock_20d_ret - nifty_20d_ret, 2)
            }
        except Exception as e:
            return {"rs_5_day": None, "rs_20_day": None}

    @staticmethod
    def get_full_technical_snapshot(symbol: str):
        try:
            if not symbol.endswith(".NS") and not symbol.endswith(".BO") and not symbol.startswith("^"):
                symbol = f"{symbol}.NS"
                
            ticker = yf.Ticker(symbol)
            # Fetch 2 years of data for accurate RSI calculation
            df = ticker.history(period="2y", interval="1d")
            
            # If ema values are NaN, try fetching with auto_adjust=True
            emas_test = TechnicalAnalysisService.calculate_emas(df)
            if not emas_test or any(v is None or math.isnan(v) for v in emas_test.values() if v is not None):
                df = ticker.history(period="2y", interval="1d", auto_adjust=True)
            
            # Validate data
            if df is None or df.empty:
                return {"error": f"No data returned for {symbol}"}

            # Fix datetime index issues
            if not hasattr(df.index, 'date'):
                df.index = pd.to_datetime(df.index)

            # Remove timezone info if present
            if hasattr(df.index, 'tz') and df.index.tz:
                df.index = df.index.tz_localize(None)
                
            trend_status = TechnicalAnalysisService.detect_trend(df)
            momentum_rsi = TechnicalAnalysisService.calculate_rsi(df)
            momentum_macd = TechnicalAnalysisService.calculate_macd(df)
            momentum_adx = TechnicalAnalysisService.calculate_adx(df)
        except Exception as e:
            return {"error": f"Failed to calculate technicals: {str(e)}"}
        
        # Calculate overall score out of 100
        score = 50 # Neutral start
        
        # Trend modifiers
        if trend_status == "Strong Uptrend": score += 20
        elif trend_status == "Uptrend": score += 10
        elif trend_status == "Downtrend": score -= 10
        elif trend_status == "Strong Downtrend": score -= 20
        
        # RSI modifiers
        rsi_val = momentum_rsi.get('value')
        if rsi_val:
            if 40 <= rsi_val <= 60: score += 5
            elif rsi_val > 70: score -= 10 # Overbought, prone to pullback
            elif rsi_val < 30: score += 10 # Oversold, potential bounce
            
        # MACD modifiers
        macd_cross = momentum_macd.get('crossover')
        if macd_cross == "Bullish Crossover": score += 10
        elif macd_cross == "Bearish Crossover": score -= 10
        elif momentum_macd.get('hist', 0) and momentum_macd.get('hist', 0) > 0: score += 5
        
        # ADX modifiers (only adds strength to the direction)
        if momentum_adx.get('strength') in ["Strong", "Very Strong"]:
            if score > 50: score += 5
            elif score < 50: score -= 5
            
        # Cap score
        score = max(0, min(100, score))
        
        verdict = "Neutral"
        if score >= 80: verdict = "Strong Buy"
        elif score >= 60: verdict = "Buy"
        elif score <= 20: verdict = "Strong Sell"
        elif score <= 40: verdict = "Sell"

        return {
            "trend": {
                "status": trend_status,
                "emas": TechnicalAnalysisService.calculate_emas(df),
                "smas": TechnicalAnalysisService.calculate_smas(df)
            },
            "momentum": {
                "rsi": momentum_rsi,
                "macd": momentum_macd,
                "adx": momentum_adx,
                "stoch_rsi": TechnicalAnalysisService.calculate_stoch_rsi(df)
            },
            "volume": {
                "obv": TechnicalAnalysisService.calculate_obv(df),
                "vwap": TechnicalAnalysisService.calculate_vwap(df),
                "relative_volume": TechnicalAnalysisService.calculate_relative_volume(df),
                "current_volume": float(df['Volume'].values[-1]) if df is not None and len(df) > 0 else None,
                "average_volume": float(np.nanmean(df['Volume'].values[-21:-1])) if df is not None and len(df) > 20 else (float(np.nanmean(df['Volume'].values[:-1])) if df is not None and len(df) > 1 else None)
            },
            "volatility": {
                "atr": TechnicalAnalysisService.calculate_atr(df),
                "bollinger_bands": TechnicalAnalysisService.calculate_bollinger_bands(df)
            },
            "relative_strength": TechnicalAnalysisService.calculate_relative_strength(df),
            "structure": {
                "current_price": TechnicalAnalysisService._safe_get(df['Close'].values) if df is not None and not df.empty else 0,
                "market_structure": TechnicalAnalysisService.detect_market_structure(df),
                "support_resistance": TechnicalAnalysisService.find_support_resistance(df)
            },
            "patterns": TechnicalAnalysisService.detect_candlestick_patterns(df),
            "overall_technical_score": int(score),
            "technical_verdict": verdict
        }
