from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class JournalEntryBase(BaseModel):
    trade_id: str
    strategy: Optional[str] = Field(default=None, max_length=128)
    emotion: Optional[str] = Field(default=None, max_length=64)
    notes: Optional[str] = None
    entry_rationale: Optional[str] = None
    exit_rationale: Optional[str] = None


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryUpdate(BaseModel):
    strategy: Optional[str] = Field(default=None, max_length=128)
    emotion: Optional[str] = Field(default=None, max_length=64)
    notes: Optional[str] = None
    entry_rationale: Optional[str] = None
    exit_rationale: Optional[str] = None


class JournalEntry(JournalEntryBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class JournalAttachment(BaseModel):
    id: str
    journal_entry_id: str
    file_type: str  # 'image', 'audio', 'document'
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    created_at: datetime


