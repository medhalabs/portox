from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Sequence

import uuid

import duckdb

from app.config import settings


def _ensure_parent_dir(path: Path) -> None:
    """Ensure parent directory exists, handling permission errors gracefully."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        # If we can't create the directory, try to use it if it exists
        if not path.parent.exists():
            raise
        # If it exists but we can't write, that's a different issue
        if not os.access(path.parent, os.W_OK):
            raise


@contextmanager
def get_conn() -> Iterator[duckdb.DuckDBPyConnection]:
    db_path = settings.resolved_duckdb_path
    _ensure_parent_dir(db_path)
    conn = duckdb.connect(str(db_path))
    try:
        yield conn
    finally:
        conn.close()


def init_db() -> None:
    """Initialize database schema. Tables use IF NOT EXISTS so this is safe to run multiple times."""
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")
    with get_conn() as conn:
        # Execute schema (uses IF NOT EXISTS, so safe to run multiple times)
        # This allows new tables to be added to schema.sql and created on startup
        conn.execute(schema_sql)


def fetch_all(sql: str, params: Optional[Sequence[Any]] = None) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        cursor = conn.execute(sql, params or [])
        cols = [d[0] for d in cursor.description]
        rows = cursor.fetchall()

    def norm(v: Any) -> Any:
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    return [{c: norm(v) for c, v in zip(cols, row)} for row in rows]


def fetch_one(sql: str, params: Optional[Sequence[Any]] = None) -> Optional[Dict[str, Any]]:
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: Optional[Sequence[Any]] = None) -> None:
    with get_conn() as conn:
        conn.execute(sql, params or [])


