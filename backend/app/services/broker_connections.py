from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.db.duckdb import execute, fetch_all, fetch_one
from app.utils.crypto import decrypt_json, encrypt_json


def list_connections(user_id: str) -> List[Dict[str, Any]]:
    rows = fetch_all(
        """
        SELECT id, user_id, broker, encrypted_blob, created_at, updated_at
        FROM broker_connections
        WHERE user_id = ?
        ORDER BY updated_at DESC
        """.strip(),
        [user_id],
    )
    # Never return encrypted blob
    return [
        {
            "id": r["id"],
            "broker": r["broker"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
        }
        for r in rows
    ]


def get_connection_credentials(user_id: str, broker: str) -> Optional[Dict[str, Any]]:
    row = fetch_one(
        """
        SELECT encrypted_blob
        FROM broker_connections
        WHERE user_id = ? AND lower(broker) = lower(?)
        ORDER BY updated_at DESC
        LIMIT 1
        """.strip(),
        [user_id, broker],
    )
    if not row:
        return None
    return decrypt_json(str(row["encrypted_blob"]))


def upsert_connection(user_id: str, broker: str, credentials: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    broker = broker.strip().lower()
    blob = encrypt_json(credentials)

    # DuckDB doesn't have native UPSERT in older versions; do a simple replace.
    execute("DELETE FROM broker_connections WHERE user_id = ? AND lower(broker) = lower(?)", [user_id, broker])
    conn_id = str(uuid4())
    execute(
        """
        INSERT INTO broker_connections (id, user_id, broker, encrypted_blob, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """.strip(),
        [conn_id, user_id, broker, blob, now, now],
    )
    return {"id": conn_id, "broker": broker, "created_at": now, "updated_at": now}


def delete_connection(user_id: str, broker: str) -> None:
    execute("DELETE FROM broker_connections WHERE user_id = ? AND lower(broker) = lower(?)", [user_id, broker])


