from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

from app.services.pnl_service import TradeRow, compute_fifo
from app.services.analytics_service import overview_from_trades


def compare_performance_periods(
    trades: List[TradeRow],
    period1_start: datetime,
    period1_end: datetime,
    period2_start: datetime,
    period2_end: datetime,
) -> Dict[str, Any]:
    """
    Compare performance metrics between two time periods.
    
    Returns comparison metrics including:
    - P&L comparison
    - Win rate comparison
    - Trade count comparison
    - Risk metrics comparison
    """
    # Filter trades for each period
    period1_trades = [
        t for t in trades
        if period1_start <= t.trade_time <= period1_end
    ]
    period2_trades = [
        t for t in trades
        if period2_start <= t.trade_time <= period2_end
    ]

    # Calculate analytics for each period
    period1_analytics = overview_from_trades(period1_trades) if period1_trades else _empty_analytics()
    period2_analytics = overview_from_trades(period2_trades) if period2_trades else _empty_analytics()

    # Calculate differences
    pnl_diff = period2_analytics["realized_pnl"] - period1_analytics["realized_pnl"]
    pnl_percent_change = (
        (pnl_diff / abs(period1_analytics["realized_pnl"])) * 100
        if period1_analytics["realized_pnl"] != 0
        else 0
    )

    win_rate_diff = period2_analytics["win_rate"] - period1_analytics["win_rate"]
    trade_count_diff = len(period2_trades) - len(period1_trades)

    return {
        "period1": {
            "start": period1_start.isoformat(),
            "end": period1_end.isoformat(),
            "analytics": period1_analytics,
            "trade_count": len(period1_trades),
        },
        "period2": {
            "start": period2_start.isoformat(),
            "end": period2_end.isoformat(),
            "analytics": period2_analytics,
            "trade_count": len(period2_trades),
        },
        "comparison": {
            "pnl_difference": pnl_diff,
            "pnl_percent_change": pnl_percent_change,
            "win_rate_difference": win_rate_diff,
            "trade_count_difference": trade_count_diff,
            "avg_win_difference": period2_analytics["avg_win"] - period1_analytics["avg_win"],
            "avg_loss_difference": period2_analytics["avg_loss"] - period1_analytics["avg_loss"],
            "drawdown_difference": period2_analytics["drawdown"] - period1_analytics["drawdown"],
        },
    }


def _empty_analytics() -> Dict[str, Any]:
    """Return empty analytics structure"""
    return {
        "realized_pnl": 0.0,
        "unrealized_pnl": 0.0,
        "total_pnl": 0.0,
        "win_rate": 0.0,
        "avg_win": 0.0,
        "avg_loss": 0.0,
        "drawdown": 0.0,
        "risk_reward_ratio": None,
        "advanced_metrics": {
            "sharpe_ratio": None,
            "sortino_ratio": None,
            "calmar_ratio": None,
            "profit_factor": None,
            "expectancy": None,
            "avg_holding_period_days": None,
        },
    }

