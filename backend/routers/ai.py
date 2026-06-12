from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List
from services.ai_service import AIService

router = APIRouter()

@router.post("/analyze/{symbol}")
async def analyze_stock(symbol: str, data_bundle: Dict[str, Any] = Body(...)):
    """
    Expects a data_bundle JSON payload containing:
    {
        "quote": {},
        "technical": {},
        "fundamental": {},
        "news": [],
        "market_regime": "Bull",
        "sector_performance": "Strong"
    }
    """
    result = await AIService.generate_stock_analysis(symbol, data_bundle)
    if "error" in result:
        # Check if rate limited or API error
        status_code = 429 if "rate limit" in result["error"].lower() else 500
        raise HTTPException(status_code=status_code, detail=result["error"])
    return {"symbol": symbol, "analysis": result}

@router.post("/portfolio-review")
async def review_portfolio(holdings: List[Dict[str, Any]] = Body(...)):
    """
    Expects a list of holdings:
    [{"symbol": "RELIANCE.NS", "quantity": 10, "avg_price": 2500, "current_price": 2800}]
    """
    result = await AIService.analyze_portfolio(holdings)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"portfolio_review": result}

@router.get("/explain/{indicator}")
async def explain_indicator(indicator: str, value: str = Query(..., description="Current value or signal of the indicator")):
    result = await AIService.explain_indicator(indicator, value)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
