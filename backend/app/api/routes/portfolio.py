from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.db.duckdb import fetch_all
from app.models.analytics import MarkPricesRequest
from app.services.analytics_service import overview_from_trades
from app.services.pnl_service import TradeRow

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


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


@router.get("/summary")
def summary(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    ov = overview_from_trades(trades)
    return {
        "realized_pnl": ov["realized_pnl"],
        "unrealized_pnl": ov["unrealized_pnl"],
        "total_pnl": ov["total_pnl"],
        "open_positions": ov["open_positions"],
        "notes": ov["notes"],
    }


@router.post("/summary")
def summary_with_marks(payload: MarkPricesRequest, user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    try:
        ov = overview_from_trades(trades, marks=payload.marks)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {
        "realized_pnl": ov["realized_pnl"],
        "unrealized_pnl": ov["unrealized_pnl"],
        "total_pnl": ov["total_pnl"],
        "open_positions": ov["open_positions"],
        "notes": ov["notes"],
    }


@router.get("/open-positions")
def open_positions(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    ov = overview_from_trades(trades)
    return {"open_positions": ov["open_positions"], "notes": ov["notes"]}


