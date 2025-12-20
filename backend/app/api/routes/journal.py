from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user
from app.db.postgresql import execute, fetch_all, fetch_one
from app.models.journal import JournalEntry, JournalEntryCreate, JournalEntryUpdate
from app.services.export_service import export_journal_csv

router = APIRouter(prefix="/journal", tags=["journal"])


def _ensure_trade_belongs_to_user(trade_id: str, user_id: str) -> None:
    trade = fetch_one("SELECT id FROM trades WHERE id = ? AND user_id = ?", [trade_id, user_id])
    if not trade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")


@router.get("", response_model=List[JournalEntry])
def list_entries(user: dict = Depends(get_current_user)) -> List[JournalEntry]:
    rows = fetch_all(
        """
        SELECT je.id, je.trade_id, je.strategy, je.emotion, je.notes, je.entry_rationale, je.exit_rationale, je.created_at, je.updated_at
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE t.user_id = ?
        ORDER BY je.created_at DESC
        """.strip(),
        [user["id"]],
    )
    return [JournalEntry(**r) for r in rows]


@router.post("", response_model=JournalEntry, status_code=status.HTTP_201_CREATED)
def create_entry(payload: JournalEntryCreate, user: dict = Depends(get_current_user)) -> JournalEntry:
    _ensure_trade_belongs_to_user(payload.trade_id, str(user["id"]))

    entry_id = str(uuid4())
    created_at = datetime.now(timezone.utc)
    execute(
        "INSERT INTO journal_entries (id, trade_id, strategy, emotion, notes, entry_rationale, exit_rationale, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            entry_id,
            payload.trade_id,
            payload.strategy,
            payload.emotion,
            payload.notes,
            payload.entry_rationale,
            payload.exit_rationale,
            created_at,
            created_at,
        ],
    )
    row = fetch_one(
        "SELECT id, trade_id, strategy, emotion, notes, entry_rationale, exit_rationale, created_at, updated_at FROM journal_entries WHERE id = ?",
        [entry_id],
    )
    return JournalEntry(**row)  # type: ignore[arg-type]


@router.put("/{entry_id}", response_model=JournalEntry)
def update_entry(entry_id: str, payload: JournalEntryUpdate, user: dict = Depends(get_current_user)) -> JournalEntry:
    # Ensure ownership via join
    existing = fetch_one(
        """
        SELECT je.id
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE je.id = ? AND t.user_id = ?
        """.strip(),
        [entry_id, user["id"]],
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")

    fields = payload.model_dump(exclude_unset=True)
    if fields:
        sets = ", ".join([f"{k} = ?" for k in fields.keys()])
        sets += ", updated_at = ?" if sets else "updated_at = ?"
        params = list(fields.values()) + [datetime.now(timezone.utc), entry_id]
        execute(f"UPDATE journal_entries SET {sets} WHERE id = ?", params)

    row = fetch_one(
        "SELECT id, trade_id, strategy, emotion, notes, entry_rationale, exit_rationale, created_at, updated_at FROM journal_entries WHERE id = ?",
        [entry_id],
    )
    return JournalEntry(**row)  # type: ignore[arg-type]


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_entry(entry_id: str, user: dict = Depends(get_current_user)) -> Response:
    existing = fetch_one(
        """
        SELECT je.id
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE je.id = ? AND t.user_id = ?
        """.strip(),
        [entry_id, user["id"]],
    )
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")
    execute("DELETE FROM journal_entries WHERE id = ?", [entry_id])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export/csv")
def export_csv(user: dict = Depends(get_current_user)) -> StreamingResponse:
    """Export all journal entries to CSV"""
    rows = fetch_all(
        """
        SELECT je.id, je.trade_id, je.strategy, je.emotion, je.notes, je.created_at
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE t.user_id = ?
        ORDER BY je.created_at DESC
        """.strip(),
        [user["id"]],
    )
    entries = [dict(r) for r in rows]
    csv_data = export_journal_csv(entries)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=journal_export.csv"},
    )


