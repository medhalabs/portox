from __future__ import annotations

from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext

from app.auth.dependencies import get_current_user
from app.auth.jwt import create_access_token
from app.db.postgresql import execute, fetch_all, fetch_one
from app.models.user import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=72)


class DeleteAccountRequest(BaseModel):
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


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


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict:
    """Request a password reset. Generates a token and stores it in the database."""
    user = fetch_one("SELECT id, email FROM users WHERE lower(email) = lower(?)", [payload.email])
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Generate a secure token
    reset_token = token_urlsafe(32)
    token_id = str(uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)  # Token expires in 1 hour
    
    # Store the token
    execute(
        "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)",
        [token_id, str(user["id"]), reset_token, expires_at],
    )
    
    # TODO: In production, send email with reset link
    # For now, we'll return the token in development mode
    # In production, this should be removed and email should be sent instead
    import os
    if os.getenv("ENV", "dev") != "prod":
        # Development: return token in response (for testing)
        return {
            "message": "Password reset token generated. In production, this would be sent via email.",
            "token": reset_token,  # Remove this in production
            "reset_url": f"/reset-password?token={reset_token}",
        }
    
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest) -> dict:
    """Reset password using a valid reset token."""
    # Find the token
    token_data = fetch_one(
        """
        SELECT prt.id, prt.user_id, prt.expires_at, prt.used, u.email
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.token = ? AND prt.used = FALSE
        """,
        [payload.token],
    )
    
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    # Check if token is expired
    expires_at = token_data["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
    elif isinstance(expires_at, datetime):
        # Ensure timezone-aware
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        # Mark as used even though expired
        execute("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", [token_data["id"]])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    # Validate password length
    password_bytes = payload.new_password.encode("utf-8")
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long. Maximum 72 bytes allowed.",
        )
    
    # Update password
    user_id = str(token_data["user_id"])
    new_password_hash = pwd_context.hash(payload.new_password)
    execute("UPDATE users SET password_hash = ? WHERE id = ?", [new_password_hash, user_id])
    
    # Mark token as used
    execute("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", [token_data["id"]])
    
    return {"message": "Password reset successfully"}


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
