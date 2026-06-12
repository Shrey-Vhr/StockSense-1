from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session
import json

from database import get_db
from models.screener import SavedScreener
from services.screener_service import ScreenerEngine, INDICATOR_CATALOGUE

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------
class ScreenerCondition(BaseModel):
    indicator: str
    operator: str = "greater_than"
    value: Optional[float] = None
    value2: Optional[float] = None


class RunScreenerRequest(BaseModel):
    conditions: List[ScreenerCondition] = Field(default_factory=list)
    sort_by: str = "score"
    sort_order: str = "desc"
    limit: int = 20


class SaveScreenerRequest(BaseModel):
    name: str
    description: str = ""
    conditions: List[ScreenerCondition]
    sort_by: str = "score"
    sort_order: str = "desc"


# ---------------------------------------------------------------------------
# POST /run — Run screener with custom conditions
# ---------------------------------------------------------------------------
@router.post("/run")
async def run_screener(body: RunScreenerRequest):
    try:
        # Convert Pydantic models to dicts for the engine
        conditions_dicts = [c.model_dump() for c in body.conditions]
        result = await ScreenerEngine.run(
            conditions=conditions_dicts,
            sort_by=body.sort_by,
            sort_order=body.sort_order,
            limit=body.limit,
        )
        if isinstance(result, dict) and "error" in result and not result.get("results"):
            raise HTTPException(status_code=500, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Screener failed: {str(e)}")


# ---------------------------------------------------------------------------
# GET /indicators — Full catalogue for the frontend condition builder
# ---------------------------------------------------------------------------
@router.get("/indicators")
async def get_indicators():
    return INDICATOR_CATALOGUE


# ---------------------------------------------------------------------------
# GET /saved — List all saved screener configurations
# ---------------------------------------------------------------------------
@router.get("/saved")
def get_saved_screeners(db: Session = Depends(get_db)):
    rows = db.query(SavedScreener).order_by(SavedScreener.updated_at.desc()).all()
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
def save_screener(body: SaveScreenerRequest, db: Session = Depends(get_db)):
    conditions_json = json.dumps([c.model_dump() for c in body.conditions])
    row = SavedScreener(
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
def delete_saved_screener(screener_id: int, db: Session = Depends(get_db)):
    row = db.query(SavedScreener).filter(SavedScreener.id == screener_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Saved screener not found")
    db.delete(row)
    db.commit()
    return {"message": "Screener deleted successfully", "id": screener_id}
