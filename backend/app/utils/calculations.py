from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable, List, Tuple
import math


@dataclass(frozen=True)
class EquityPoint:
    t: datetime
    equity: float


def max_drawdown(points: Iterable[EquityPoint]) -> float:
    peak = None
    mdd = 0.0
    for p in points:
        peak = p.equity if peak is None else max(peak, p.equity)
        dd = peak - p.equity
        mdd = max(mdd, dd)
    return float(mdd)


def bucket_hour(dt: datetime) -> int:
    return int(dt.hour)


def bucket_weekday(dt: datetime) -> int:
    # Monday=0 ... Sunday=6
    return int(dt.weekday())


def sharpe_ratio(returns: List[float], risk_free_rate: float = 0.0) -> float | None:
    """Calculate Sharpe Ratio: (mean_return - risk_free_rate) / std_dev"""
    if not returns or len(returns) < 2:
        return None
    mean_return = sum(returns) / len(returns)
    variance = sum((r - mean_return) ** 2 for r in returns) / (len(returns) - 1)
    std_dev = math.sqrt(variance)
    if std_dev == 0:
        return None
    return (mean_return - risk_free_rate) / std_dev


def sortino_ratio(returns: List[float], risk_free_rate: float = 0.0) -> float | None:
    """Calculate Sortino Ratio: (mean_return - risk_free_rate) / downside_deviation"""
    if not returns or len(returns) < 2:
        return None
    mean_return = sum(returns) / len(returns)
    downside_returns = [r for r in returns if r < 0]
    if not downside_returns:
        return None  # No downside, ratio is undefined
    downside_variance = sum(r ** 2 for r in downside_returns) / len(downside_returns)
    downside_dev = math.sqrt(downside_variance)
    if downside_dev == 0:
        return None
    return (mean_return - risk_free_rate) / downside_dev


def calmar_ratio(total_return: float, max_dd: float) -> float | None:
    """Calculate Calmar Ratio: annual_return / max_drawdown"""
    if max_dd == 0 or max_dd < 0:
        return None
    # Assuming total_return is already annualized or we use it as is
    # In practice, you'd annualize it, but for simplicity using as-is
    return abs(total_return / max_dd) if max_dd > 0 else None


def profit_factor(gross_profit: float, gross_loss: float) -> float | None:
    """Calculate Profit Factor: gross_profit / abs(gross_loss)"""
    if gross_loss == 0:
        return None
    return abs(gross_profit / gross_loss) if gross_loss < 0 else None


def expectancy(wins: List[float], losses: List[float], win_rate: float) -> float | None:
    """Calculate Expectancy: (win_rate * avg_win) + ((1 - win_rate) * avg_loss)"""
    if not wins and not losses:
        return None
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    return (win_rate * avg_win) + ((1 - win_rate) * avg_loss)


def average_holding_period(entry_times: List[datetime], exit_times: List[datetime]) -> float | None:
    """Calculate average holding period in days"""
    if not entry_times or not exit_times or len(entry_times) != len(exit_times):
        return None
    periods = [(exit - entry).total_seconds() / 86400.0 for entry, exit in zip(entry_times, exit_times)]
    return sum(periods) / len(periods)


