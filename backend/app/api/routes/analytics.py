from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.db.duckdb import fetch_all
from app.models.analytics import OverviewRequest
from app.services.analytics_service import overview_from_trades, performance_from_trades, realized_matches
from app.services.pnl_service import TradeRow

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _load_trades(user_id: str) -> list[TradeRow]:
    rows = fetch_all(
        """
        SELECT id, user_id, symbol, side, quantity, price, trade_time, fees
        FROM trades
        WHERE user_id = ?
        ORDER BY trade_time ASC
        """.strip(),
        [user_id],
    )
    return [TradeRow(**r) for r in rows]  # type: ignore[arg-type]


@router.get("/overview")
def overview(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    return overview_from_trades(trades)


@router.post("/overview")
def overview_with_marks(payload: OverviewRequest, user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    try:
        return overview_from_trades(trades, marks=payload.marks, strict=payload.strict)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/realized-matches")
def matches(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    return {"matches": realized_matches(trades)}


def _load_journal_tags(user_id: str) -> dict:
    # Latest journal entry per trade_id (schema doesn't enforce 1:1).
    rows = fetch_all(
        """
        SELECT je.trade_id, je.strategy, je.emotion, je.created_at
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE t.user_id = ?
        ORDER BY je.created_at DESC
        """.strip(),
        [user_id],
    )
    out: dict = {}
    for r in rows:
        tid = str(r["trade_id"])
        if tid not in out:
            out[tid] = {"strategy": r.get("strategy"), "emotion": r.get("emotion")}
    return out


@router.get("/performance")
def performance(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    tags = _load_journal_tags(str(user["id"]))
    return performance_from_trades(trades, journal_by_trade_id=tags)


