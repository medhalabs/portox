from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


TradeSide = Literal["BUY", "SELL"]


class TradeBase(BaseModel):
    symbol: str = Field(min_length=1, max_length=32)
    side: TradeSide
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)
    trade_time: datetime
    fees: float = Field(default=0, ge=0)


class TradeCreate(TradeBase):
    pass


class TradeUpdate(BaseModel):
    symbol: Optional[str] = Field(default=None, min_length=1, max_length=32)
    side: Optional[TradeSide] = None
    quantity: Optional[int] = Field(default=None, gt=0)
    price: Optional[float] = Field(default=None, gt=0)
    trade_time: Optional[datetime] = None
    fees: Optional[float] = Field(default=None, ge=0)


class Trade(TradeBase):
    id: str
    user_id: str


