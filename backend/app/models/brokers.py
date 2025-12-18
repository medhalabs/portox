from __future__ import annotations

from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field


BrokerName = Literal["zerodha", "upstox", "dhan"]


class BrokerImportRequest(BaseModel):
    # Credentials are provided per-request in Phase 1 (not stored).
    # For a production SaaS, tokens should be stored server-side encrypted with explicit user consent.
    api_key: Optional[str] = None  # Zerodha
    access_token: str = Field(min_length=1)
    client_id: Optional[str] = None  # Dhan (when using access-token auth scheme)

    from_date: Optional[date] = None
    to_date: Optional[date] = None


class BrokerConnectRequest(BaseModel):
    # Persist credentials server-side (encrypted).
    # For Zerodha: access_token is typically short-lived; users may need to reconnect periodically.
    api_key: Optional[str] = None
    access_token: str = Field(min_length=1)
    client_id: Optional[str] = None



