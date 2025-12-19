from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.responses import FileResponse

from app.auth.dependencies import get_current_user
from app.config import settings
from app.db.duckdb import execute, fetch_all, fetch_one
from app.models.journal import JournalAttachment


router = APIRouter(prefix="/journal/attachments", tags=["journal"])


ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf", "text/plain"}
MAX_FILE_SIZE = settings.max_upload_size_mb * 1024 * 1024  # Convert MB to bytes


def _ensure_journal_entry_belongs_to_user(entry_id: str, user_id: str) -> None:
    """Verify that the journal entry belongs to the user"""
    entry = fetch_one(
        """
        SELECT je.id
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE je.id = ? AND t.user_id = ?
        """.strip(),
        [entry_id, user_id],
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Journal entry not found")


def _get_file_type(mime_type: str) -> str:
    """Determine file type from mime type"""
    if mime_type in ALLOWED_IMAGE_TYPES:
        return "image"
    elif mime_type in ALLOWED_AUDIO_TYPES:
        return "audio"
    elif mime_type in ALLOWED_DOCUMENT_TYPES:
        return "document"
    else:
        return "document"  # Default fallback


@router.post("/{entry_id}", response_model=JournalAttachment)
async def upload_attachment(
    entry_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> JournalAttachment:
    """Upload an attachment to a journal entry"""
    _ensure_journal_entry_belongs_to_user(entry_id, str(user["id"]))

    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES | ALLOWED_AUDIO_TYPES | ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: images (JPEG, PNG, GIF, WebP), audio (MP3, WAV, OGG, M4A), documents (PDF, TXT)",
        )

    # Validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.max_upload_size_mb}MB",
        )

    # Create user-specific directory
    upload_dir = settings.resolved_upload_dir
    user_dir = upload_dir / str(user["id"])
    user_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_ext = Path(file.filename).suffix if file.filename else ""
    attachment_id = str(uuid4())
    file_name = f"{attachment_id}{file_ext}"
    file_path = user_dir / file_name

    # Save file
    file_path.write_bytes(content)

    # Get file type
    file_type = _get_file_type(file.content_type or "")

    # Save to database
    created_at = datetime.now(timezone.utc)
    execute(
        """
        INSERT INTO journal_attachments 
        (id, journal_entry_id, file_type, file_path, file_name, file_size, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            attachment_id,
            entry_id,
            file_type,
            str(file_path.relative_to(upload_dir)),  # Store relative path
            file.filename or file_name,
            len(content),
            file.content_type or "application/octet-stream",
            created_at,
        ],
    )

    row = fetch_one(
        "SELECT id, journal_entry_id, file_type, file_path, file_name, file_size, mime_type, created_at FROM journal_attachments WHERE id = ?",
        [attachment_id],
    )
    return JournalAttachment(**row)  # type: ignore[arg-type]


@router.get("/{entry_id}", response_model=list[JournalAttachment])
def list_attachments(
    entry_id: str,
    user: dict = Depends(get_current_user),
) -> list[JournalAttachment]:
    """List all attachments for a journal entry"""
    _ensure_journal_entry_belongs_to_user(entry_id, str(user["id"]))

    rows = fetch_all(
        """
        SELECT id, journal_entry_id, file_type, file_path, file_name, file_size, mime_type, created_at
        FROM journal_attachments
        WHERE journal_entry_id = ?
        ORDER BY created_at DESC
        """,
        [entry_id],
    )
    return [JournalAttachment(**r) for r in rows]


@router.get("/download/{attachment_id}")
def download_attachment(
    attachment_id: str,
    user: dict = Depends(get_current_user),
) -> FileResponse:
    """Download an attachment"""
    attachment = fetch_one(
        """
        SELECT ja.id, ja.journal_entry_id, ja.file_path, ja.file_name, ja.mime_type
        FROM journal_attachments ja
        JOIN journal_entries je ON je.id = ja.journal_entry_id
        JOIN trades t ON t.id = je.trade_id
        WHERE ja.id = ? AND t.user_id = ?
        """.strip(),
        [attachment_id, user["id"]],
    )
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    upload_dir = settings.resolved_upload_dir
    file_path = upload_dir / attachment["file_path"]

    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(
        path=str(file_path),
        filename=attachment["file_name"],
        media_type=attachment["mime_type"],
    )


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: str,
    user: dict = Depends(get_current_user),
) -> Response:
    """Delete an attachment"""
    attachment = fetch_one(
        """
        SELECT ja.id, ja.file_path
        FROM journal_attachments ja
        JOIN journal_entries je ON je.id = ja.journal_entry_id
        JOIN trades t ON t.id = je.trade_id
        WHERE ja.id = ? AND t.user_id = ?
        """.strip(),
        [attachment_id, user["id"]],
    )
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    # Delete file
    upload_dir = settings.resolved_upload_dir
    file_path = upload_dir / attachment["file_path"]
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass  # Continue even if file deletion fails

    # Delete database record
    execute("DELETE FROM journal_attachments WHERE id = ?", [attachment_id])
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

