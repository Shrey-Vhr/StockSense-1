import json
import logging
import asyncio
import time
from functools import wraps
from anthropic import Anthropic
from config import settings

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    def _call_claude(system_prompt: str, user_prompt: str, model="claude-sonnet-4-6"):
        if not settings.ANTHROPIC_API_KEY:
            return {"error": "Anthropic API key is not configured in environment variables."}
            
        try:
            client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = client.messages.create(
                model=model,
                max_tokens=4000,
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
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude JSON. Error: {e}")
            logger.error(f"Raw text received: {text[:500]}")
            return {"error": f"AI returned malformed JSON: {str(e)}"}
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return {"error": f"AI Engine error: {str(e)}"}

    @staticmethod
    async def generate_stock_analysis(
        symbol: str, data_bundle: dict, 
        analysis_type: str = 'full'
    ):
        logger.info(f"AI Analysis called: {symbol} | type: {analysis_type}")
        system_prompt = (
            "You are an expert Indian stock market analyst with 20 years of experience in NSE/BSE markets. "
            "You specialize in swing trading using technical and fundamental analysis. "
            "You analyze stocks for a retail investor who wants clear, actionable recommendations with full explanations. "
            "Enforce analysis of quarterly trajectories, institutional trends, and peer valuations. "
            "Use the `red_flags` array to output specific warning types for the frontend (e.g., Institutional Selling, Revenue Decline, Overvaluation). "
            "For SWING trades, heavily weight the Daily Trend (EMA 20/50) and Relative Strength vs Nifty. Ignore long-term fundamental valuation for the swing entry trigger. "
            "If ADX is below 20 (choppy market) OR Relative Strength is negative (underperforming Nifty), automatically give the Swing verdict as 'Wait' or 'Avoid' regardless of how good the fundamentals are. "
            "Ensure the JSON output for timeframes.swing includes a new field called setup_type (e.g., 'Pullback', 'Breakout', 'Range Bound'). "
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
        
        atr = tech.get('volatility', {}).get('atr', 'N/A')
        rs = tech.get('relative_strength', {})
        rs_5_day = rs.get('rs_5_day', 'N/A')
        rs_20_day = rs.get('rs_20_day', 'N/A')
        
        # We can extract EMA status logically
        emas = tech.get('trend', {}).get('emas', {})
        e20, e50 = emas.get('ema20'), emas.get('ema50')
        ema_status = f"20EMA({e20}) vs 50EMA({e50})" if e20 and e50 else "N/A"
        
        fund_score = fund.get('fundamental_score', 50)
        
        pe = fund.get('pe_ratio', 'N/A')
        
        roe_raw = fund.get('roe', 'N/A')
        if roe_raw and roe_raw != 'N/A':
            roe_val = round(float(roe_raw) * 100, 2) if float(roe_raw) < 1 else round(float(roe_raw), 2)
        else:
            roe_val = 'N/A'
        
        de = fund.get('debt_to_equity', 'N/A')
        rev_growth = fund.get('revenue_growth_yoy', 'N/A')
        profit_growth = fund.get('profit_growth_yoy', 'N/A')
        promoter = fund.get('promoter_holding', 'N/A')
        
        sector = fund.get('sector', quote.get('sector', 'N/A'))
        company_name = fund.get('company_name', 
                       quote.get('company_name', symbol))
        market_cap = fund.get('market_cap', 
                     quote.get('market_cap', 'N/A'))
                     
        # --- NEW EXTRACTIONS ---
        inst = data_bundle.get('institutional', {})
        
        # 1. Institutional Trend
        promoter_activity = inst.get('promoter_activity', {}).get('trend', 'Stable')
        fii_trend = inst.get('institutional_verdict', 'Neutral')
        promoter_pledge_percent = fund.get('promoter_pledge', 'N/A')
        institutional_trend = {
            "promoter_activity": promoter_activity,
            "fii_trend": fii_trend,
            "promoter_pledge_percent": promoter_pledge_percent
        }
        
        # 2. Quarterly Trajectory
        q_res = fund.get('quarterly_results', {})
        quarterly_trajectory = {
            "quarters": q_res.get('quarters', []),
            "revenue": q_res.get('revenue', []),
            "net_profit": q_res.get('net_profit', [])
        }
        
        # 3. Peer Comparison
        peers = fund.get('peers', [])
        industry_pe = "N/A"
        industry_avg_roe = "N/A"
        if peers:
            pe_list = [p['pe_ratio'] for p in peers if p.get('pe_ratio') is not None]
            roce_list = [p['roce'] for p in peers if p.get('roce') is not None]
            industry_pe = round(sum(pe_list)/len(pe_list), 2) if pe_list else "N/A"
            industry_avg_roe = round(sum(roce_list)/len(roce_list), 2) if roce_list else "N/A"
        
        peer_comparison = {
            "industry_pe": industry_pe,
            "industry_avg_roe": industry_avg_roe
        }
        
        # 4. Sector specific prompt logic
        sector_prompt = ""
        sector_lower = str(sector).lower()
        if "pharma" in sector_lower:
            sector_prompt = "SECTOR CONTEXT (Pharma): Focus heavily on USFDA risks, product pipeline, and R&D spending."
        elif "it" in sector_lower or "information technology" in sector_lower or "software" in sector_lower:
            sector_prompt = "SECTOR CONTEXT (IT): Focus heavily on client concentration, deal wins, attrition, and USDINR impact."
        elif "bank" in sector_lower or "finance" in sector_lower or "nbfc" in sector_lower:
            sector_prompt = "SECTOR CONTEXT (Banks/Financials): Focus heavily on Asset Quality (NPAs), Credit Growth, and NIMs (Net Interest Margins)."
        
        logger.info(f"Fund data extracted: PE={pe}, ROE={roe_val}, "
                    f"D/E={de}, RevGrowth={rev_growth}, "
                    f"ProfitGrowth={profit_growth}, Promoter={promoter}")
        
        sentiment_score = "N/A"
        top_headlines = ""
        if news and isinstance(news, list) and len(news) > 0:
            top_headlines = "; ".join([n.get('title', '') for n in news[:5]])

        if analysis_type == 'trade_setup':
            user_prompt = f"""You are a trading desk analyst.
For {symbol} ({company_name}) at ₹{price}, 
give ONLY trade setup details. No fluff.

{sector_prompt}

Technical: Trend={trend}, RSI={rsi}, 
MACD={macd_signal}, Support=₹{support}, 
Resistance=₹{resistance}, Pattern={pattern_str}

Institutional: Promoter Activity={institutional_trend['promoter_activity']}, FII Trend={institutional_trend['fii_trend']}, Promoter Pledge={institutional_trend['promoter_pledge_percent']}%
Quarterly Trajectory: Quarters={quarterly_trajectory['quarters']}, Rev={quarterly_trajectory['revenue']}, Profit={quarterly_trajectory['net_profit']}
Peers: Ind PE={peer_comparison['industry_pe']}, Ind ROE={peer_comparison['industry_avg_roe']}%

Respond in this exact JSON:
{{
  "verdict": "Take/Avoid/Wait",
  "confidence": 0-100,
  "summary": "One sentence on whether to trade now",
  "risk_level": "Low/Medium/High/Very High",
  "bull_case": "one sentence",
  "bear_case": "one sentence", 
  "red_flags": ["list"],
  "key_levels_to_watch": ["levels"],
  "technical_reasoning": "detailed entry logic",
  "fundamental_reasoning": "one sentence only",
  "news_impact": "one sentence only",
  "trade_setup": {{
    "entry": "exact price or range",
    "stop_loss": "exact price",
    "target_1": "price",
    "target_2": "price",
    "target_3": "price",
    "risk_reward": "ratio",
    "risk_percent": "% risk"
  }},
  "timeframes": {{
    "intraday": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "intraday specific logic"
    }},
    "swing": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "setup_type": "Pullback/Breakout/Range Bound",
      "holding_period": "X-Y days",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "target_3": "price",
      "risk_reward": "ratio",
      "risk_percent": "% risk",
      "reasoning": "swing specific logic"
    }},
    "midterm": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "X-Y months",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "midterm logic"
    }},
    "longterm": {{
      "verdict": "Accumulate/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "X+ years",
      "reasoning": "long term thesis",
      "key_risks": ["risks"]
    }}
  }}
}}"""

        elif analysis_type == 'risk':
            user_prompt = f"""You are a risk manager. 
Assess ALL risks for {symbol} ({company_name}) at ₹{price}.
Be brutally honest about what can go wrong.

{sector_prompt}

Data: Trend={trend}, RSI={rsi}, ADX={adx},
Tech Score={tech_score}/100, Fund Score={fund_score}/100,
Promoter={promoter}%, Support=₹{support}

Institutional: Promoter Activity={institutional_trend['promoter_activity']}, FII Trend={institutional_trend['fii_trend']}, Promoter Pledge={institutional_trend['promoter_pledge_percent']}%
Quarterly Trajectory: Quarters={quarterly_trajectory['quarters']}, Rev={quarterly_trajectory['revenue']}, Profit={quarterly_trajectory['net_profit']}
Peers: Ind PE={peer_comparison['industry_pe']}, Ind ROE={peer_comparison['industry_avg_roe']}%

SWING TRADING PARAMETERS (7-20 days):
- Relative Strength (RS): 5D ({rs_5_day}%) | 20D ({rs_20_day}%) 
  (If RS is positive, stock is outperforming Nifty. Prioritize positive RS stocks).
- Volatility (ATR): {atr}

SWING SETUP LOGIC:
1. Setup Type: Classify this swing setup as either "Pullback to EMA 20/50", "Breakout with Volume", or "Range Bound".
2. Stop Loss Calculation: Use a volatility-based stop loss. SL = Entry - (1.5 * ATR) OR recent swing low, whichever is tighter. Do not use wide support levels for swing SL.
3. Target Calculation: Target must be at least 1:2 Risk:Reward based on the ATR stop loss.

Respond in this exact JSON:
{{
  "verdict": "Low Risk/Medium Risk/High Risk/Very High Risk",
  "confidence": 0-100,
  "summary": "Risk assessment in 2 sentences",
  "risk_level": "Low/Medium/High/Very High",
  "bull_case": "only scenario where risk is worth it",
  "bear_case": "worst case scenario with price targets",
  "red_flags": [
    "list every specific risk you see minimum 6 items"
  ],
  "key_levels_to_watch": [
    "levels where risk increases significantly"
  ],
  "technical_reasoning": "technical risk factors in detail",
  "fundamental_reasoning": "fundamental risk factors in detail",
  "news_impact": "macro and news risks",
  "trade_setup": {{
    "entry": "only if risk is manageable",
    "stop_loss": "strict stop loss for risk management",
    "target_1": "conservative target",
    "target_2": "optimistic target",
    "target_3": "best case",
    "risk_reward": "ratio",
    "risk_percent": "max acceptable risk %"
  }},
  "timeframes": {{
    "intraday": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "intraday risk assessment"
    }},
    "swing": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "setup_type": "Pullback/Breakout/Range Bound",
      "holding_period": "X-Y days",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "target_3": "price",
      "risk_reward": "ratio",
      "risk_percent": "% risk",
      "reasoning": "swing risk assessment"
    }},
    "midterm": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "X-Y months",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "midterm risk factors"
    }},
    "longterm": {{
      "verdict": "Accumulate/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "X+ years",
      "reasoning": "long term risk vs reward",
      "key_risks": ["specific long term risks"]
    }}
  }}
}}"""

        elif analysis_type == 'fundamental':
            user_prompt = f"""You are a fundamental analyst (CFA).
Deep dive on {symbol} ({company_name}) fundamentals only.
Ignore short term price action almost entirely.

{sector_prompt}

Fundamentals: PE={pe}, ROE={roe_val}%, D/E={de},
Revenue Growth={rev_growth}%, Profit Growth={profit_growth}%,
Promoter={promoter}%, Fund Score={fund_score}/100,
Price=₹{price}, Market Cap={market_cap}

Institutional: Promoter Activity={institutional_trend['promoter_activity']}, FII Trend={institutional_trend['fii_trend']}, Promoter Pledge={institutional_trend['promoter_pledge_percent']}%
Quarterly Trajectory: Quarters={quarterly_trajectory['quarters']}, Rev={quarterly_trajectory['revenue']}, Profit={quarterly_trajectory['net_profit']}
Peers: Ind PE={peer_comparison['industry_pe']}, Ind ROE={peer_comparison['industry_avg_roe']}%

Respond in this exact JSON:
{{
  "verdict": "Strong Buy/Buy/Hold/Sell/Strong Sell",
  "confidence": 0-100,
  "summary": "Fundamental verdict in 2-3 sentences",
  "risk_level": "Low/Medium/High/Very High",
  "bull_case": "fundamental bull thesis",
  "bear_case": "fundamental bear thesis",
  "red_flags": ["fundamental red flags only"],
  "key_levels_to_watch": ["valuation levels to watch"],
  "technical_reasoning": "ignore technicals, say N/A for short term",
  "fundamental_reasoning": "deep 5-6 sentence fundamental analysis covering valuation, quality, growth, and management",
  "news_impact": "fundamental catalysts to watch",
  "trade_setup": {{
    "entry": "fundamental value buy zone",
    "stop_loss": "price that breaks fundamental thesis",
    "target_1": "fair value estimate",
    "target_2": "optimistic valuation",
    "target_3": "bull case valuation",
    "risk_reward": "ratio",
    "risk_percent": "% from entry to thesis break"
  }},
  "timeframes": {{
    "intraday": {{
      "verdict": "Avoid",
      "confidence": 0,
      "entry": "N/A",
      "stop_loss": "N/A",
      "target_1": "N/A",
      "target_2": "N/A",
      "risk_reward": "N/A",
      "reasoning": "Fundamental analysis not relevant for intraday"
    }},
    "swing": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "setup_type": "Pullback/Breakout/Range Bound",
      "holding_period": "weeks",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "target_3": "price",
      "risk_reward": "ratio",
      "risk_percent": "% risk",
      "reasoning": "fundamental backing for swing"
    }},
    "midterm": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "months",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "fundamental midterm thesis"
    }},
    "longterm": {{
      "verdict": "Accumulate/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "years",
      "reasoning": "core long term fundamental thesis in detail",
      "key_risks": ["fundamental risks to monitor"]
    }}
  }}
}}"""

        else:  # full analysis
            user_prompt = f"""Analyze {symbol} ({company_name}) 
comprehensively for all trade timeframes.

{sector_prompt}

Price: ₹{price} | Change: {change}%
Technical: Trend={trend}, Score={tech_score}/100,
RSI={rsi}, MACD={macd_signal}, ADX={adx},
Pattern={pattern_str}, Support=₹{support}, 
Resistance=₹{resistance}, Volume={rel_volume}x avg

Fundamental: Score={fund_score}/100, PE={pe},
ROE={roe_val}%, D/E={de}, Rev Growth={rev_growth}%,
Profit Growth={profit_growth}%, Promoter={promoter}%

Institutional: Promoter Activity={institutional_trend['promoter_activity']}, FII Trend={institutional_trend['fii_trend']}, Promoter Pledge={institutional_trend['promoter_pledge_percent']}%
Quarterly Trajectory: Quarters={quarterly_trajectory['quarters']}, Rev={quarterly_trajectory['revenue']}, Profit={quarterly_trajectory['net_profit']}
Peers: Ind PE={peer_comparison['industry_pe']}, Ind ROE={peer_comparison['industry_avg_roe']}%

Market: {market_regime} | Sector: {sector_perf}
News: {top_headlines}

SWING TRADING PARAMETERS (7-20 days):
- Relative Strength (RS): 5D ({rs_5_day}%) | 20D ({rs_20_day}%) 
  (If RS is positive, stock is outperforming Nifty. Prioritize positive RS stocks).
- Volatility (ATR): {atr}

SWING SETUP LOGIC:
1. Setup Type: Classify this swing setup as either "Pullback to EMA 20/50", "Breakout with Volume", or "Range Bound".
2. Stop Loss Calculation: Use a volatility-based stop loss. SL = Entry - (1.5 * ATR) OR recent swing low, whichever is tighter. Do not use wide support levels for swing SL.
3. Target Calculation: Target must be at least 1:2 Risk:Reward based on the ATR stop loss.

Respond in this exact JSON:
{{
  "verdict": "Strong Buy/Buy/Neutral/Avoid/Strong Avoid",
  "confidence": 0-100,
  "summary": "3 sentence balanced summary",
  "risk_level": "Low/Medium/High/Very High",
  "bull_case": "detailed bull thesis",
  "bear_case": "detailed bear thesis",
  "red_flags": ["all concerns"],
  "key_levels_to_watch": ["all key price levels"],
  "technical_reasoning": "detailed technical analysis",
  "fundamental_reasoning": "detailed fundamental analysis",
  "news_impact": "news and macro impact",
  "trade_setup": {{
    "entry": "price or range",
    "stop_loss": "price",
    "target_1": "price",
    "target_2": "price",
    "target_3": "price",
    "risk_reward": "ratio",
    "risk_percent": "% risk"
  }},
  "timeframes": {{
    "intraday": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "intraday specific"
    }},
    "swing": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "setup_type": "Pullback/Breakout/Range Bound",
      "holding_period": "X-Y days",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "target_3": "price",
      "risk_reward": "ratio",
      "risk_percent": "% risk",
      "reasoning": "swing specific"
    }},
    "midterm": {{
      "verdict": "Take/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "X-Y months",
      "entry": "price",
      "stop_loss": "price",
      "target_1": "price",
      "target_2": "price",
      "risk_reward": "ratio",
      "reasoning": "midterm specific"
    }},
    "longterm": {{
      "verdict": "Accumulate/Avoid/Wait",
      "confidence": 0-100,
      "holding_period": "X+ years",
      "reasoning": "long term thesis",
      "key_risks": ["long term risks"]
    }}
  }}
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
        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt, model="claude-haiku-4-5")

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
        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt, model="claude-haiku-4-5")

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
        return await asyncio.to_thread(AIService._call_claude, system_prompt, user_prompt, model="claude-haiku-4-5")
