from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Tuple


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


