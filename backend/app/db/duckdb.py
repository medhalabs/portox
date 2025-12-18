from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Sequence

import uuid

import duckdb

from app.config import settings


def _ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


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
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schema_sql = schema_path.read_text(encoding="utf-8")
    with get_conn() as conn:
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


