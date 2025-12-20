from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import decode_token
from app.db.postgresql import fetch_one

security = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = fetch_one("SELECT id, email, created_at FROM users WHERE id = ?", [user_id])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


