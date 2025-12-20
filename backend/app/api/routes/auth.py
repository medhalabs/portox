from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext

from app.auth.dependencies import get_current_user
from app.auth.jwt import create_access_token
from app.db.postgresql import execute, fetch_all, fetch_one
from app.models.user import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=72)


class DeleteAccountRequest(BaseModel):
    password: str


@router.post("/register", response_model=UserPublic)
def register(payload: RegisterRequest) -> UserPublic:
    existing = fetch_one("SELECT id FROM users WHERE lower(email) = lower(?)", [payload.email])
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    # bcrypt has a 72-byte limit for passwords
    password_bytes = payload.password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long. Maximum 72 bytes allowed.",
        )

    user_id = str(uuid4())
    password_hash = pwd_context.hash(payload.password)
    created_at = datetime.now(timezone.utc)
    execute(
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        [user_id, payload.email, password_hash, created_at],
    )
    return UserPublic(id=user_id, email=payload.email, created_at=created_at)


@router.get("/me", response_model=UserPublic)
def get_current_user_info(user: dict = Depends(get_current_user)) -> UserPublic:
    """Get current user information"""
    row = fetch_one("SELECT id, email, created_at FROM users WHERE id = ?", [user["id"]])
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserPublic(**row)  # type: ignore[arg-type]


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = fetch_one("SELECT id, email, password_hash FROM users WHERE lower(email) = lower(?)", [payload.email])
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=str(user["id"]), email=str(user["email"]))
    return TokenResponse(access_token=token)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Change user password"""
    # Verify old password
    user_data = fetch_one("SELECT password_hash FROM users WHERE id = ?", [user["id"]])
    if not user_data or not pwd_context.verify(payload.old_password, user_data["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    # Update password
    new_password_hash = pwd_context.hash(payload.new_password)
    execute("UPDATE users SET password_hash = ? WHERE id = ?", [new_password_hash, user["id"]])

    return {"message": "Password changed successfully"}


@router.post("/delete-account")
def delete_account(
    payload: DeleteAccountRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Delete user account and all associated data (GDPR compliance)"""
    # Verify password
    user_data = fetch_one("SELECT password_hash FROM users WHERE id = ?", [user["id"]])
    if not user_data or not pwd_context.verify(payload.password, user_data["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password is incorrect")

    user_id = str(user["id"])

    # Delete all user data in correct order (respecting foreign key constraints)
    # 1. Delete journal attachments and files
    import shutil
    from app.config import settings
    upload_dir = settings.resolved_upload_dir
    user_dir = upload_dir / user_id
    if user_dir.exists():
        shutil.rmtree(user_dir, ignore_errors=True)

    execute("DELETE FROM journal_attachments WHERE journal_entry_id IN (SELECT je.id FROM journal_entries je JOIN trades t ON t.id = je.trade_id WHERE t.user_id = ?)", [user_id])
    execute("DELETE FROM journal_entries WHERE trade_id IN (SELECT id FROM trades WHERE user_id = ?)", [user_id])
    execute("DELETE FROM trades WHERE user_id = ?", [user_id])
    execute("DELETE FROM broker_connections WHERE user_id = ?", [user_id])
    execute("DELETE FROM notification_preferences WHERE user_id = ?", [user_id])
    execute("DELETE FROM notifications WHERE user_id = ?", [user_id])
    execute("DELETE FROM users WHERE id = ?", [user_id])

    return {"message": "Account deleted successfully"}


@router.get("/export-data")
def export_all_user_data(user: dict = Depends(get_current_user)) -> dict:
    """Export all user data for GDPR compliance"""
    user_id = str(user["id"])

    # Fetch all user data
    user_data = fetch_one("SELECT id, email, created_at FROM users WHERE id = ?", [user_id])
    trades_data = fetch_all("SELECT * FROM trades WHERE user_id = ? ORDER BY trade_time", [user_id])
    journal_data = fetch_all(
        """
        SELECT je.* FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE t.user_id = ?
        ORDER BY je.created_at
        """.strip(),
        [user_id],
    )
    broker_connections = fetch_all("SELECT id, broker, created_at, updated_at FROM broker_connections WHERE user_id = ?", [user_id])
    notification_prefs = fetch_one("SELECT * FROM notification_preferences WHERE user_id = ?", [user_id])
    notifications = fetch_all("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at", [user_id])

    return {
        "user": user_data,
        "trades": trades_data,
        "journal_entries": journal_data,
        "broker_connections": broker_connections,
        "notification_preferences": notification_prefs,
        "notifications": notifications,
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }
