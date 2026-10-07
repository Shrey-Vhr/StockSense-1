from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ValidationError
from typing import Annotated, List, Optional, Union
from sqlalchemy.orm import Session
import asyncio
import json
import logging

from database import get_db
from models.screener import SavedScreener
from services.screener_service import ScreenerEngine, INDICATOR_CATALOGUE
from routers.auth import get_current_user
from rate_limit import by_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Applied per-route rather than on the router so it is obvious that /stream is
# included too. The frontend reads that endpoint with fetch rather than
# EventSource precisely so it can send an Authorization header — EventSource
# cannot, and the alternative was putting a token in the query string.
_authed = [Depends(get_current_user)]

# A run downloads a year of history for ~2,100 stocks. Being signed in is not
# enough to be allowed to start several at once, so: a few runs per user per
# minute, and at most two running on the whole server at any moment.
_run_limited = [Depends(by_user("screener", 5, 60))]
_RUN_SLOTS = asyncio.Semaphore(2)
_BUSY = "The screener is already running at capacity. Try again in a minute."

MAX_CONDITIONS = 20


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------
# equal_to conditions compare against strings and booleans as well as numbers
# (see _evaluate_condition in screener_service), so all three are accepted.
_Threshold = Optional[Union[bool, float, Annotated[str, Field(max_length=64)]]]


class ScreenerCondition(BaseModel):
    indicator: str = Field(max_length=64)
    operator: str = Field(default="greater_than", max_length=32)
    value: _Threshold = None
    value2: _Threshold = None


class RunScreenerRequest(BaseModel):
    conditions: List[ScreenerCondition] = Field(default_factory=list, max_length=MAX_CONDITIONS)
    sort_by: str = Field(default="score", max_length=64)
    sort_order: str = Field(default="desc", max_length=4)
    limit: int = Field(default=20, ge=1, le=100)


class SaveScreenerRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    conditions: List[ScreenerCondition] = Field(max_length=MAX_CONDITIONS)
    sort_by: str = Field(default="score", max_length=64)
    sort_order: str = Field(default="desc", max_length=4)


from fastapi.responses import StreamingResponse


async def _holding_slot(gen):
    # The slot is taken inside the generator, so it is only held once the
    # response actually starts streaming, and `async with` releases it whether
    # the scan finishes, fails, or the client disconnects mid-way.
    async with _RUN_SLOTS:
        async for chunk in gen:
            yield chunk

# ---------------------------------------------------------------------------
# GET /stream — Run screener with SSE
# ---------------------------------------------------------------------------
@router.get("/stream", dependencies=_authed + _run_limited)
async def run_screener_stream(conditions: str):
    try:
        raw = json.loads(conditions)
        if not isinstance(raw, list) or len(raw) > MAX_CONDITIONS:
            raise ValueError("bad conditions")
        conds = [ScreenerCondition.model_validate(c).model_dump() for c in raw]
    except (ValueError, ValidationError):
        raise HTTPException(
            status_code=400,
            detail=f"conditions must be a JSON list of at most {MAX_CONDITIONS} conditions",
        )
    if _RUN_SLOTS.locked():
        raise HTTPException(status_code=429, detail=_BUSY)
    return StreamingResponse(
        _holding_slot(ScreenerEngine.run_stream(conditions=conds)),
        media_type="text/event-stream"
    )

# ---------------------------------------------------------------------------
# POST /run — Run screener with custom conditions
# ---------------------------------------------------------------------------
@router.post("/run", dependencies=_authed + _run_limited)
async def run_screener(body: RunScreenerRequest):
    if _RUN_SLOTS.locked():
        raise HTTPException(status_code=429, detail=_BUSY)
    try:
        async with _RUN_SLOTS:
            # Convert Pydantic models to dicts for the engine
            conditions_dicts = [c.model_dump() for c in body.conditions]
            result = await ScreenerEngine.run(
                conditions=conditions_dicts,
                sort_by=body.sort_by,
                sort_order=body.sort_order,
                limit=body.limit,
            )
        if isinstance(result, dict) and "error" in result and not result.get("results"):
            logger.error("Screener returned error: %s", result["error"])
            raise HTTPException(status_code=500, detail="Screener failed. See server logs.")
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Screener run failed")
        raise HTTPException(status_code=500, detail="Screener failed. See server logs.")


# ---------------------------------------------------------------------------
# GET /indicators — Full catalogue for the frontend condition builder
# ---------------------------------------------------------------------------
@router.get("/indicators", dependencies=_authed)
async def get_indicators():
    return INDICATOR_CATALOGUE


# ---------------------------------------------------------------------------
# GET /saved — List all saved screener configurations
# ---------------------------------------------------------------------------
@router.get("/saved")
def get_saved_screeners(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rows = (
        db.query(SavedScreener)
        .filter(SavedScreener.user_id == current_user.id)
        .order_by(SavedScreener.updated_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "conditions": json.loads(r.conditions),
            "sort_by": r.sort_by,
            "sort_order": r.sort_order,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# POST /save — Save a named screener configuration
# ---------------------------------------------------------------------------
@router.post("/save")
def save_screener(body: SaveScreenerRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    conditions_json = json.dumps([c.model_dump() for c in body.conditions])
    row = SavedScreener(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        conditions=conditions_json,
        sort_by=body.sort_by,
        sort_order=body.sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "name": row.name,
        "message": "Screener saved successfully",
    }


# ---------------------------------------------------------------------------
# DELETE /saved/{id} — Delete a saved screener
# ---------------------------------------------------------------------------
@router.delete("/saved/{screener_id}")
def delete_saved_screener(screener_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Someone else's screener answers 404, same as a missing one, so ids
    # cannot be probed for existence.
    row = db.query(SavedScreener).filter(
        SavedScreener.id == screener_id,
        SavedScreener.user_id == current_user.id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Saved screener not found")
    db.delete(row)
    db.commit()
    return {"message": "Screener deleted successfully", "id": screener_id}
