from __future__ import annotations

from typing import Dict, Optional

from pydantic import BaseModel, Field


class MarkPricesRequest(BaseModel):
    # e.g. { "RELIANCE": 2450.5, "TCS": 3980.0 }
    marks: Dict[str, float] = Field(default_factory=dict)


class OverviewRequest(MarkPricesRequest):
    # If true, require that every open symbol has a mark; otherwise fallback to last trade price.
    strict: bool = False


