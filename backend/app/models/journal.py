from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class JournalEntryBase(BaseModel):
    trade_id: str
    strategy: Optional[str] = Field(default=None, max_length=128)
    emotion: Optional[str] = Field(default=None, max_length=64)
    notes: Optional[str] = None


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryUpdate(BaseModel):
    strategy: Optional[str] = Field(default=None, max_length=128)
    emotion: Optional[str] = Field(default=None, max_length=64)
    notes: Optional[str] = None


class JournalEntry(JournalEntryBase):
    id: str
    created_at: datetime


