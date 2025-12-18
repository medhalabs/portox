from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Optional


Side = Literal["BUY", "SELL"]


@dataclass(frozen=True)
class NormalizedTrade:
    symbol: str
    side: Side
    quantity: int
    price: float
    trade_time: datetime
    fees: float = 0.0


