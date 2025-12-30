from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.db.postgresql import fetch_all
from app.models.analytics import MarkPricesRequest
from app.services.analytics_service import overview_from_trades
from app.services.pnl_service import TradeRow
from app.services.mf_pnl_service import MutualFundRow, compute_mf_positions_with_nav

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


def _load_mutual_funds(user_id: str) -> list[MutualFundRow]:
    rows = fetch_all(
        """
        SELECT id, user_id, scheme_code, scheme_name, units, nav, investment_date, fees
        FROM mutual_funds
        WHERE user_id = ?
        ORDER BY investment_date ASC
        """.strip(),
        [user_id],
    )
    return [MutualFundRow(**r) for r in rows]  # type: ignore[arg-type]


@router.get("/summary")
async def summary(user: dict = Depends(get_current_user), type: str = "all") -> dict:
    """
    Get portfolio summary. type can be 'trades', 'mutual_funds', or 'all' (default).
    """
    if type == "mutual_funds":
        mf_investments = _load_mutual_funds(str(user["id"]))
        mf_positions = await compute_mf_positions_with_nav(mf_investments)
        mf_unrealized_pnl = sum(pos.unrealized_pnl for pos in mf_positions.values())
        
        open_positions = []
        for pos in mf_positions.values():
            open_positions.append({
                "symbol": pos.scheme_code,
                "name": pos.scheme_name,
                "qty": pos.total_units,
                "avg_price": pos.avg_nav,
                "current_price": pos.current_nav or pos.avg_nav,
                "unrealized_pnl": pos.unrealized_pnl,
                "type": "mutual_fund",
            })
        
        return {
            "realized_pnl": 0.0,
            "unrealized_pnl": mf_unrealized_pnl,
            "total_pnl": mf_unrealized_pnl,
            "open_positions": open_positions,
            "notes": {
                "type": "mutual_funds_only",
            },
        }
    elif type == "trades":
        trades = _load_trades(str(user["id"]))
        ov = overview_from_trades(trades)
        return {
            "realized_pnl": ov["realized_pnl"],
            "unrealized_pnl": ov["unrealized_pnl"],
            "total_pnl": ov["total_pnl"],
            "open_positions": ov["open_positions"],
            "notes": {
                **ov["notes"],
                "type": "trades_only",
            },
        }
    else:  # type == "all"
        trades = _load_trades(str(user["id"]))
        mf_investments = _load_mutual_funds(str(user["id"]))
        
        # Calculate trades PnL
        ov = overview_from_trades(trades)
        
        # Calculate mutual funds PnL
        mf_positions = await compute_mf_positions_with_nav(mf_investments)
        mf_unrealized_pnl = sum(pos.unrealized_pnl for pos in mf_positions.values())
        
        # Combine open positions
        combined_open_positions = list(ov["open_positions"])
        for pos in mf_positions.values():
            combined_open_positions.append({
                "symbol": pos.scheme_code,
                "name": pos.scheme_name,
                "qty": pos.total_units,
                "avg_price": pos.avg_nav,
                "current_price": pos.current_nav or pos.avg_nav,
                "unrealized_pnl": pos.unrealized_pnl,
                "type": "mutual_fund",
            })
        
        return {
            "realized_pnl": ov["realized_pnl"],
            "unrealized_pnl": ov["unrealized_pnl"] + mf_unrealized_pnl,
            "total_pnl": ov["total_pnl"] + mf_unrealized_pnl,
            "open_positions": combined_open_positions,
            "notes": {
                **ov["notes"],
                "includes_mutual_funds": len(mf_positions) > 0,
                "type": "all",
            },
        }


@router.post("/summary")
async def summary_with_marks(payload: MarkPricesRequest, user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    mf_investments = _load_mutual_funds(str(user["id"]))
    
    try:
        ov = overview_from_trades(trades, marks=payload.marks)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    # Calculate mutual funds PnL (use provided marks if available for scheme codes)
    mf_marks = {k: v for k, v in (payload.marks or {}).items() if k.startswith("MF_")}
    mf_positions = await compute_mf_positions_with_nav(mf_investments)
    
    # Override NAVs with provided marks if available
    for code, pos in mf_positions.items():
        mark_key = f"MF_{code}"
        if mark_key in mf_marks:
            pos.current_nav = mf_marks[mark_key]
            pos.current_value = pos.current_nav * pos.total_units
            pos.unrealized_pnl = pos.current_value - pos.total_investment
    
    mf_unrealized_pnl = sum(pos.unrealized_pnl for pos in mf_positions.values())
    
    # Combine open positions
    combined_open_positions = list(ov["open_positions"])
    for pos in mf_positions.values():
        combined_open_positions.append({
            "symbol": pos.scheme_code,
            "name": pos.scheme_name,
            "qty": pos.total_units,
            "avg_price": pos.avg_nav,
            "current_price": pos.current_nav or pos.avg_nav,
            "unrealized_pnl": pos.unrealized_pnl,
            "type": "mutual_fund",
        })
    
    return {
        "realized_pnl": ov["realized_pnl"],
        "unrealized_pnl": ov["unrealized_pnl"] + mf_unrealized_pnl,
        "total_pnl": ov["total_pnl"] + mf_unrealized_pnl,
        "open_positions": combined_open_positions,
        "notes": {
            **ov["notes"],
            "includes_mutual_funds": len(mf_positions) > 0,
        },
    }


@router.get("/open-positions")
async def open_positions(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    mf_investments = _load_mutual_funds(str(user["id"]))
    
    ov = overview_from_trades(trades)
    mf_positions = await compute_mf_positions_with_nav(mf_investments)
    
    # Combine open positions
    combined_open_positions = list(ov["open_positions"])
    for pos in mf_positions.values():
        combined_open_positions.append({
            "symbol": pos.scheme_code,
            "name": pos.scheme_name,
            "qty": pos.total_units,
            "avg_price": pos.avg_nav,
            "current_price": pos.current_nav or pos.avg_nav,
            "unrealized_pnl": pos.unrealized_pnl,
            "type": "mutual_fund",
        })
    
    return {
        "open_positions": combined_open_positions,
        "notes": {
            **ov["notes"],
            "includes_mutual_funds": len(mf_positions) > 0,
        },
    }


