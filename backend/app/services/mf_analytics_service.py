from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from typing import Any, Dict, List

from app.services.mf_pnl_service import MutualFundRow, compute_mf_positions_with_nav


async def overview_from_mutual_funds(investments: List[MutualFundRow]) -> Dict[str, Any]:
    """
    Generate analytics overview for mutual fund investments.
    Since mutual funds don't have realized PnL (unless redeemed), we focus on unrealized PnL.
    """
    if not investments:
        return {
            "realized_pnl": 0.0,
            "unrealized_pnl": 0.0,
            "total_pnl": 0.0,
            "total_investment": 0.0,
            "current_value": 0.0,
            "open_positions": [],
            "by_scheme": [],
            "notes": {
                "type": "mutual_funds",
                "no_realized_pnl": "Mutual funds show unrealized PnL only (no redemptions tracked)",
            },
        }
    
    # Calculate positions with current NAVs
    positions = await compute_mf_positions_with_nav(investments)
    
    total_investment = sum(pos.total_investment for pos in positions.values())
    current_value = sum(pos.current_value for pos in positions.values())
    unrealized_pnl = current_value - total_investment
    
    # Open positions
    open_positions = []
    for pos in positions.values():
        open_positions.append({
            "symbol": pos.scheme_code,
            "name": pos.scheme_name,
            "qty": pos.total_units,
            "avg_price": pos.avg_nav,
            "current_price": pos.current_nav or pos.avg_nav,
            "unrealized_pnl": pos.unrealized_pnl,
            "type": "mutual_fund",
        })
    
    # Performance by scheme
    by_scheme = []
    for pos in sorted(positions.values(), key=lambda p: abs(p.unrealized_pnl), reverse=True):
        by_scheme.append({
            "scheme_code": pos.scheme_code,
            "scheme_name": pos.scheme_name,
            "total_investment": pos.total_investment,
            "current_value": pos.current_value,
            "unrealized_pnl": pos.unrealized_pnl,
            "return_percent": ((pos.current_value - pos.total_investment) / pos.total_investment * 100) if pos.total_investment > 0 else 0.0,
            "units": pos.total_units,
        })
    
    return {
        "realized_pnl": 0.0,  # No realized PnL for mutual funds (redemptions not tracked)
        "unrealized_pnl": unrealized_pnl,
        "total_pnl": unrealized_pnl,
        "win_rate": 0.0,  # Not applicable for mutual funds
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "drawdown": 0.0,
        "risk_reward_ratio": None,
        "time_buckets": {
            "pnl_by_hour": {},
            "pnl_by_weekday": {},
        },
        "open_positions": open_positions,
        "notes": {
            "type": "mutual_funds",
            "no_realized_pnl": "Mutual funds show unrealized PnL only (no redemptions tracked)",
            "total_schemes": len(positions),
            "total_investment": total_investment,
            "current_value": current_value,
            "by_scheme": by_scheme,
        },
    }


async def performance_from_mutual_funds(investments: List[MutualFundRow]) -> Dict[str, Any]:
    """
    Generate performance data for mutual funds.
    Since there are no "matches" or "trades", we focus on investment performance over time.
    """
    if not investments:
        return {
            "stats": {
                "total_investment": 0.0,
                "current_value": 0.0,
                "total_return": 0.0,
                "total_return_percent": 0.0,
            },
            "series": {
                "daily_investment": [],
                "equity_curve": [],
            },
            "breakdowns": {
                "by_scheme": [],
            },
        }
    
    positions = await compute_mf_positions_with_nav(investments)
    
    total_investment = sum(pos.total_investment for pos in positions.values())
    current_value = sum(pos.current_value for pos in positions.values())
    total_return = current_value - total_investment
    total_return_percent = (total_return / total_investment * 100) if total_investment > 0 else 0.0
    
    # Daily investment tracking (cumulative)
    investments_sorted = sorted(investments, key=lambda inv: inv.investment_date)
    daily_investment: Dict[date, float] = defaultdict(float)
    equity_by_day: Dict[date, float] = defaultdict(float)
    
    cum_investment = 0.0
    for inv in investments_sorted:
        inv_date = inv.investment_date.date() if isinstance(inv.investment_date, datetime) else inv.investment_date
        investment_amount = (inv.nav * inv.units) + inv.fees
        cum_investment += investment_amount
        daily_investment[inv_date] = cum_investment
    
    # Equity curve (using current value as endpoint)
    equity_points = []
    for inv_date, inv_amount in sorted(daily_investment.items()):
        equity_points.append({
            "date": inv_date.isoformat(),
            "equity": inv_amount,  # Investment amount at that time
        })
    
    # Add current value as final point
    if equity_points:
        equity_points.append({
            "date": datetime.now().date().isoformat(),
            "equity": current_value,
        })
    
    # Breakdown by scheme
    by_scheme = []
    for pos in sorted(positions.values(), key=lambda p: abs(p.unrealized_pnl), reverse=True):
        return_pct = ((pos.current_value - pos.total_investment) / pos.total_investment * 100) if pos.total_investment > 0 else 0.0
        by_scheme.append({
            "key": pos.scheme_name,
            "pnl": pos.unrealized_pnl,
            "investment": pos.total_investment,
            "current_value": pos.current_value,
            "return_percent": return_pct,
        })
    
    return {
        "stats": {
            "total_investment": total_investment,
            "current_value": current_value,
            "total_return": total_return,
            "total_return_percent": total_return_percent,
        },
        "series": {
            "daily_investment": [{"date": k.isoformat(), "investment": v} for k, v in sorted(daily_investment.items())],
            "equity_curve": equity_points,
        },
        "breakdowns": {
            "by_scheme": by_scheme,
        },
    }

