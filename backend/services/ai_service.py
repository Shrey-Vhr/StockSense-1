import json
import logging
import asyncio
import time
from functools import wraps
from anthropic import Anthropic
from config import settings

logger = logging.getLogger(__name__)

# Rate limiter / Cache to enforce max 1 analysis per stock per 5 minutes (300 seconds)
def rate_limit_cache(ttl_seconds=300):
    cache = {}
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create a cache key from arguments (e.g. symbol name)
            key = str(args) + str(kwargs)
            now = time.time()
            
            if key in cache:
                result, timestamp = cache[key]
                if now - timestamp < ttl_seconds:
                    logger.info(f"Rate limit active. Returning cached AI response for {key}.")
                    return result
                    
            result = await func(*args, **kwargs)
            
            if isinstance(result, dict) and "error" not in result:
                cache[key] = (result, now)
            return result
        return wrapper
    return decorator

class AIService:
    @staticmethod
    def _call_claude(system_prompt: str, user_prompt: str, model="claude-3-opus-20240229"):
        if not settings.ANTHROPIC_API_KEY:
            return {"error": "Anthropic API key is not configured in environment variables."}
            
        try:
            client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = client.messages.create(
                model=model,
                max_tokens=1500,
                temperature=0.2,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            
            text = response.content[0].text
            # Clean JSON blocks if Claude wraps it in markdown
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse Claude JSON: {text}")
            return {"error": "AI returned malformed JSON response"}
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return {"error": f"AI Engine error: {str(e)}"}

    @staticmethod
    @rate_limit_cache(ttl_seconds=300)
    async def generate_stock_analysis(symbol: str, data_bundle: dict):
        system_prompt = (
            "You are an expert Indian stock market analyst with 20 years of experience in NSE/BSE markets. "
            "You specialize in swing trading using technical and fundamental analysis. "
            "You analyze stocks for a retail investor who wants clear, actionable recommendations with full explanations. "
            "Always respond in valid JSON format only."
        )
        
        # Safely extract data from the bundle
        quote = data_bundle.get('quote', {})
        tech = data_bundle.get('technical', {})
        fund = data_bundle.get('fundamental', {})
        news = data_bundle.get('news', [])
        market_regime = data_bundle.get('market_regime', 'Neutral')
        sector_perf = data_bundle.get('sector_performance', 'Neutral')

        # Format variables
        price = quote.get('current_price', 'N/A')
        change = quote.get('change_percent', 'N/A')
        market_cap = quote.get('market_cap', 'N/A')
        sector = fund.get('sector', 'N/A')
        company_name = fund.get('company_name', symbol)
        
        tech_score = tech.get('overall_technical_score', 50)
        trend = tech.get('trend', {}).get('status', 'Neutral')
        rsi = tech.get('momentum', {}).get('rsi', {}).get('value', 'N/A')
        macd_signal = tech.get('momentum', {}).get('macd', {}).get('crossover', 'N/A')
        adx = tech.get('momentum', {}).get('adx', {}).get('strength', 'N/A')
        rel_volume = tech.get('volume', {}).get('relative_volume', 'N/A')
        support = tech.get('structure', {}).get('support_resistance', {}).get('support', 'N/A')
        resistance = tech.get('structure', {}).get('support_resistance', {}).get('resistance', 'N/A')
        
        patterns = tech.get('patterns', [])
        pattern_str = ", ".join([p['name'] for p in patterns]) if patterns else "None"
        
        # We can extract EMA status logically
        emas = tech.get('trend', {}).get('emas', {})
        e20, e50 = emas.get('ema20'), emas.get('ema50')
        ema_status = f"20EMA({e20}) vs 50EMA({e50})" if e20 and e50 else "N/A"
        
        fund_score = fund.get('analysis', {}).get('score', 50)
        fund_metrics = fund.get('metrics', {})
        pe = fund_metrics.get('valuation', {}).get('pe_ratio', 'N/A')
        roe = fund_metrics.get('quality', {}).get('roe', 'N/A')
        roe_val = roe * 100 if roe and roe != 'N/A' else 'N/A'
        de = fund_metrics.get('health', {}).get('debt_to_equity', 'N/A')
        rev_growth = fund_metrics.get('growth', {}).get('revenue_growth_yoy_pct', 'N/A')
        profit_growth = fund_metrics.get('growth', {}).get('profit_growth_yoy_pct', 'N/A')
        promoter = fund_metrics.get('ownership', {}).get('promoter_holding_pct', 'N/A')
        
        sentiment_score = "N/A"
        top_headlines = ""
        if news and isinstance(news, list) and len(news) > 0:
            top_headlines = "; ".join([n.get('title', '') for n in news[:5]])

        user_prompt = f"""Analyze {symbol} ({company_name}) for a potential swing trade.

Current Data:
- Price: ₹{price} | Change: {change}%
- Market Cap: ₹{market_cap}
- Sector: {sector}

Technical Analysis:
- Trend: {trend} | Score: {tech_score}/100
- RSI: {rsi} | MACD: {macd_signal}
- EMA Status: {ema_status}
- ADX: {adx} (Trend Strength)
- Volume: {rel_volume}x average
- Pattern Detected: {pattern_str}
- Support: ₹{support} | Resistance: ₹{resistance}

Fundamental Analysis:
- Fundamental Score: {fund_score}/100
- PE: {pe} (Sector avg: N/A)
- ROE: {roe_val}% | Debt/Equity: {de}
- Revenue Growth: {rev_growth}% | Profit Growth: {profit_growth}%
- Promoter Holding: {promoter}%

Recent News Sentiment: {sentiment_score}/10
Top News: {top_headlines}

Market Regime: {market_regime}
Sector Strength: {sector_perf}

Provide a comprehensive analysis in this exact JSON format:
{{
  "verdict": "Strong Buy/Buy/Neutral/Avoid/Strong Avoid",
  "confidence": 0-100,
  "holding_period": "X-Y weeks",
  "trade_setup": {{
    "entry": "price or range",
    "stop_loss": "price",
    "target_1": "price",
    "target_2": "price",
    "target_3": "price",
    "risk_reward": "ratio",
    "risk_percent": "% from entry to SL"
  }},
  "risk_level": "Low/Medium/High/Very High",
  "risk_factors": ["list of specific risks"],
  "bull_case": "why this trade works",
  "bear_case": "why this trade fails",
  "technical_reasoning": "detailed explanation",
  "fundamental_reasoning": "detailed explanation",
  "news_impact": "how news affects this trade",
  "key_levels_to_watch": ["price levels"],
  "red_flags": ["any concerns"],
  "summary": "3-sentence plain English summary"
}}"""

        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt)

    @staticmethod
    async def analyze_portfolio(holdings: list):
        system_prompt = (
            "You are an expert portfolio manager. Analyze a user's stock holdings and provide rebalancing advice, "
            "risk assessment, and health scores. Output valid JSON only."
        )
        
        holdings_str = json.dumps(holdings, indent=2)
        user_prompt = f"""Review the following portfolio holdings:
{holdings_str}

Analyze for sector concentration, risk balance, and general health.
Output JSON format:
{{
    "health_score": 0-100,
    "concentration_risk": "Low/Medium/High",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "rebalancing_suggestions": ["...", "..."],
    "summary": "Brief overall assessment"
}}"""

        # We can use sonnet for lighter tasks to save costs, but Opus was requested generally.
        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt, model="claude-3-haiku-20240307")

    @staticmethod
    async def generate_swing_screener_insights(top_stocks: list):
        system_prompt = "You are a swing trading expert. Review these screened stocks and explain why they are good picks. Output JSON only."
        
        stocks_str = json.dumps(top_stocks, indent=2)
        user_prompt = f"""Review these top screened stocks:
{stocks_str}

Provide insights on the top 3 best picks among them.
Output JSON format:
{{
    "top_picks": [
        {{
            "symbol": "...",
            "reasoning": "...",
            "confidence": 0-100
        }}
    ],
    "market_context": "How the current market suits these setups"
}}"""
        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt, model="claude-3-haiku-20240307")

    @staticmethod
    async def explain_indicator(indicator_name: str, value: str):
        system_prompt = "You are a friendly trading mentor for beginners. Output valid JSON only."
        user_prompt = f"""The user is looking at the technical indicator "{indicator_name}" which currently has a value/signal of "{value}".

Provide a plain English, beginner-friendly explanation of what this means for the stock right now.
Output JSON format:
{{
    "indicator": "{indicator_name}",
    "current_value": "{value}",
    "meaning": "What this literally means (2 sentences)",
    "actionable_insight": "What the user should do with this info (1 sentence)",
    "bull_bear_bias": "Bullish/Bearish/Neutral"
}}"""
        # Extremely fast/cheap model for definitions
        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt, model="claude-3-haiku-20240307")
