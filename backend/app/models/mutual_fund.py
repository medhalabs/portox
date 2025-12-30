from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MutualFundBase(BaseModel):
    scheme_code: str = Field(min_length=1, max_length=32)
    scheme_name: str = Field(min_length=1, max_length=255)
    units: float = Field(gt=0)
    nav: float = Field(gt=0)
    investment_date: datetime
    fees: float = Field(default=0, ge=0)


class MutualFundCreate(MutualFundBase):
    pass


class MutualFundUpdate(BaseModel):
    scheme_code: Optional[str] = Field(default=None, min_length=1, max_length=32)
    scheme_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    units: Optional[float] = Field(default=None, gt=0)
    nav: Optional[float] = Field(default=None, gt=0)
    investment_date: Optional[datetime] = None
    fees: Optional[float] = Field(default=None, ge=0)


class MutualFund(MutualFundBase):
    id: str
    user_id: str

