from fastapi import APIRouter, HTTPException, Query, Body, Depends, Path
from typing import Dict, Any, List
import json
import logging
import asyncio
from services.ai_service import AIService
from services.institutional_service import get_institutional_data
from rate_limit import by_user

logger = logging.getLogger(__name__)

# Every route here spends real Anthropic credit, so on top of the router-level
# auth in main.py each user gets a small budget of calls per minute and the
# request bodies are bounded. Without the bounds, any signed-in account could
# send megabytes of "context" and bill it to whoever runs the server.
router = APIRouter(dependencies=[Depends(by_user("ai", 10, 60))])

MAX_BUNDLE_BYTES = 100_000
MAX_HOLDINGS = 100
MAX_HOLDINGS_BYTES = 50_000


def _too_large(obj, limit: int) -> bool:
    return len(json.dumps(obj, default=str)) > limit


@router.post("/analyze/{symbol}")
async def analyze_stock(
    symbol: str = Path(max_length=32),
    data_bundle: Dict[str, Any] = Body(...),
):
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
    if _too_large(data_bundle, MAX_BUNDLE_BYTES):
        raise HTTPException(status_code=413, detail="Analysis payload is too large")

    analysis_type = str(data_bundle.get('analysis_type', 'full'))[:32]
    logger.info(f"Received analysis_type: {analysis_type}")

    # Fetch and attach institutional data
    try:
        inst_data = await asyncio.to_thread(get_institutional_data, symbol, False)
        data_bundle['institutional'] = inst_data
    except Exception as e:
        logger.error(f"Failed to fetch institutional data for {symbol}: {e}")
        data_bundle['institutional'] = {}

    result = await AIService.generate_stock_analysis(symbol, data_bundle, analysis_type)
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
    if len(holdings) > MAX_HOLDINGS or _too_large(holdings, MAX_HOLDINGS_BYTES):
        raise HTTPException(
            status_code=413,
            detail=f"Send at most {MAX_HOLDINGS} holdings for review",
        )
    result = await AIService.analyze_portfolio(holdings)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return {"portfolio_review": result}

@router.get("/explain/{indicator}")
async def explain_indicator(
    indicator: str = Path(max_length=64),
    value: str = Query(..., max_length=100, description="Current value or signal of the indicator"),
):
    result = await AIService.explain_indicator(indicator, value)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result
