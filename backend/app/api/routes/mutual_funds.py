from __future__ import annotations

from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response

from app.auth.dependencies import get_current_user
from app.db.postgresql import execute, fetch_all, fetch_one
from app.models.mutual_fund import MutualFund, MutualFundCreate, MutualFundUpdate
from app.services.mfapi_service import get_latest_nav, get_historical_nav, search_mutual_funds
from datetime import datetime

router = APIRouter(prefix="/mutual-funds", tags=["mutual-funds"])


@router.get("", response_model=List[MutualFund])
def list_mutual_funds(user: dict = Depends(get_current_user)) -> List[MutualFund]:
    rows = fetch_all(
        """
        SELECT id, user_id, scheme_code, scheme_name, units, nav, investment_date, fees
        FROM mutual_funds
        WHERE user_id = ?
        ORDER BY investment_date DESC
        """.strip(),
        [user["id"]],
    )
    return [MutualFund(**r) for r in rows]


@router.post("", response_model=MutualFund, status_code=status.HTTP_201_CREATED)
def create_mutual_fund(payload: MutualFundCreate, user: dict = Depends(get_current_user)) -> MutualFund:
    mf_id = str(uuid4())
    execute(
        "INSERT INTO mutual_funds (id, user_id, scheme_code, scheme_name, units, nav, investment_date, fees) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            mf_id,
            user["id"],
            payload.scheme_code,
            payload.scheme_name,
            payload.units,
            payload.nav,
            payload.investment_date,
            payload.fees,
        ],
    )
    row = fetch_one(
        "SELECT id, user_id, scheme_code, scheme_name, units, nav, investment_date, fees FROM mutual_funds WHERE id = ?",
        [mf_id],
    )
    return MutualFund(**row)  # type: ignore[arg-type]


@router.put("/{mf_id}", response_model=MutualFund)
def update_mutual_fund(mf_id: str, payload: MutualFundUpdate, user: dict = Depends(get_current_user)) -> MutualFund:
    existing = fetch_one("SELECT id FROM mutual_funds WHERE id = ? AND user_id = ?", [mf_id, user["id"]])
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutual fund investment not found")

    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        row = fetch_one(
            "SELECT id, user_id, scheme_code, scheme_name, units, nav, investment_date, fees FROM mutual_funds WHERE id = ?",
            [mf_id],
        )
        return MutualFund(**row)  # type: ignore[arg-type]

    sets = ", ".join([f"{k} = ?" for k in fields.keys()])
    params = list(fields.values()) + [mf_id, user["id"]]
    execute(f"UPDATE mutual_funds SET {sets} WHERE id = ? AND user_id = ?", params)

    row = fetch_one(
        "SELECT id, user_id, scheme_code, scheme_name, units, nav, investment_date, fees FROM mutual_funds WHERE id = ?",
        [mf_id],
    )
    return MutualFund(**row)  # type: ignore[arg-type]


@router.delete("/{mf_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_mutual_fund(mf_id: str, user: dict = Depends(get_current_user)) -> Response:
    existing = fetch_one("SELECT id FROM mutual_funds WHERE id = ? AND user_id = ?", [mf_id, user["id"]])
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mutual fund investment not found")

    execute("DELETE FROM mutual_funds WHERE id = ? AND user_id = ?", [mf_id, user["id"]])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/search")
async def search_schemes(query: str, user: dict = Depends(get_current_user)) -> dict:
    """Search for mutual fund schemes using MFapi.in"""
    if not query or len(query) < 2:
        return {"schemes": []}
    
    schemes = await search_mutual_funds(query)
    return {"schemes": schemes}


@router.get("/nav/{scheme_code}")
async def get_nav(scheme_code: str, user: dict = Depends(get_current_user)) -> dict:
    """Get latest NAV for a scheme code"""
    nav = await get_latest_nav(scheme_code)
    if nav is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NAV not found for this scheme code")
    return {"scheme_code": scheme_code, "nav": nav}


@router.get("/nav/{scheme_code}/historical")
async def get_historical_nav_endpoint(
    scheme_code: str,
    date: str,
    user: dict = Depends(get_current_user)
) -> dict:
    """Get historical NAV for a scheme code on a specific date (YYYY-MM-DD format)"""
    try:
        investment_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Use YYYY-MM-DD")
    
    nav = await get_historical_nav(scheme_code, investment_date)
    if nav is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"NAV not found for scheme {scheme_code} on {date}"
        )
    return {"scheme_code": scheme_code, "date": date, "nav": nav}

