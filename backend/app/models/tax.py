from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class TaxReportRequest(BaseModel):
    short_term_tax_rate: Optional[float] = Field(default=None, ge=0, le=100)
    long_term_tax_rate: Optional[float] = Field(default=None, ge=0, le=100)

