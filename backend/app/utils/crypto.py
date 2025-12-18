from __future__ import annotations

import json
from typing import Any, Dict

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _fernet() -> Fernet:
    # Raises if missing.
    key = settings.resolved_broker_encryption_key
    return Fernet(key.encode("utf-8"))


def encrypt_json(data: Dict[str, Any]) -> str:
    raw = json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return _fernet().encrypt(raw).decode("utf-8")


def decrypt_json(token: str) -> Dict[str, Any]:
    try:
        raw = _fernet().decrypt(token.encode("utf-8"))
    except InvalidToken as e:
        raise ValueError("Unable to decrypt broker credentials (wrong key?)") from e
    return json.loads(raw.decode("utf-8"))


