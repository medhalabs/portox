from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext

from app.auth.jwt import create_access_token
from app.db.duckdb import execute, fetch_one
from app.models.user import LoginRequest, RegisterRequest, TokenResponse, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    user = fetch_one("SELECT id, email, password_hash FROM users WHERE lower(email) = lower(?)", [payload.email])
    if not user or not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(subject=str(user["id"]), email=str(user["email"]))
    return TokenResponse(access_token=token)


