from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Dict, Iterator, List, Optional, Sequence

import uuid

import psycopg2
from psycopg2.extras import RealDictCursor, register_uuid
from psycopg2.pool import ThreadedConnectionPool

from app.config import settings

# Register UUID type adapter for PostgreSQL
try:
    import uuid as uuid_module
    register_uuid()
except Exception:
    pass  # UUID adapter registration is optional

# Connection pool for PostgreSQL
_pool: Optional[ThreadedConnectionPool] = None


def _get_pool() -> ThreadedConnectionPool:
    """Get or create the connection pool."""
    global _pool
    if _pool is None:
        database_url = settings.postgresql_url
        if not database_url:
            raise RuntimeError("POSTGRESQL_URL is required to connect to PostgreSQL database.")
        
        # Parse connection string and create pool
        # psycopg2 can use connection strings directly
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=database_url,
        )
    return _pool


@contextmanager
def get_conn() -> Iterator[psycopg2.extensions.connection]:
    """Get a connection from the pool."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def init_db() -> None:
    """Initialize database schema. Tables use IF NOT EXISTS so this is safe to run multiple times."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    
    # Use psycopg2's execute_values or execute the whole schema at once
    # But we need to handle errors per statement, so split carefully
    # Split by semicolon, but preserve multi-line statements
    statements = []
    current_stmt = []
    
    for line in schema_sql.split('\n'):
        stripped = line.strip()
        # Skip comment-only lines
        if stripped.startswith('--') or not stripped:
            continue
        current_stmt.append(line)
        # If line ends with semicolon, we have a complete statement
        if stripped.endswith(';'):
            stmt = '\n'.join(current_stmt).strip()
            if stmt:
                statements.append(stmt.rstrip(';'))
            current_stmt = []
    
    # Handle any remaining statement
    if current_stmt:
        stmt = '\n'.join(current_stmt).strip()
        if stmt:
            statements.append(stmt.rstrip(';'))
    
    # First, create all tables
    table_statements = [s for s in statements if s.upper().replace('\n', ' ').strip().startswith("CREATE TABLE")]
    print(f"Creating {len(table_statements)} tables...")
    for statement in table_statements:
        try:
            with get_conn() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(statement)
            # Extract table name - look for the table name after CREATE TABLE [IF NOT EXISTS]
            parts = statement.upper().replace('\n', ' ').split()
            table_idx = parts.index('TABLE') + 1
            if table_idx < len(parts) and parts[table_idx] == 'IF':
                table_idx += 3  # Skip IF NOT EXISTS
            table_name = parts[table_idx] if table_idx < len(parts) else "unknown"
            print(f"✓ Table '{table_name}' created or already exists")
        except psycopg2.errors.DuplicateTable:
            # Table already exists, which is fine
            parts = statement.upper().replace('\n', ' ').split()
            table_idx = parts.index('TABLE') + 1
            if table_idx < len(parts) and parts[table_idx] == 'IF':
                table_idx += 3
            table_name = parts[table_idx] if table_idx < len(parts) else "unknown"
            print(f"✓ Table '{table_name}' already exists")
        except Exception as e:
            error_str = str(e)
            parts = statement.upper().replace('\n', ' ').split()
            table_idx = parts.index('TABLE') + 1 if 'TABLE' in parts else 0
            if table_idx < len(parts) and parts[table_idx] == 'IF':
                table_idx += 3
            table_name = parts[table_idx] if table_idx < len(parts) else "unknown"
            print(f"✗ Failed to create table '{table_name}': {e}")
    
    # Then create indexes (after tables exist)
    index_statements = [s for s in statements if s.upper().replace('\n', ' ').strip().startswith("CREATE INDEX")]
    print(f"Creating {len(index_statements)} indexes...")
    for statement in index_statements:
        try:
            with get_conn() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(statement)
        except (psycopg2.errors.DuplicateObject, psycopg2.errors.UndefinedTable):
            # Index already exists or table doesn't exist yet
            pass
        except Exception as e:
            error_str = str(e)
            if "already exists" not in error_str.lower() and "does not exist" not in error_str.lower():
                print(f"Warning: Index creation failed: {e}")
    
    # Migrations: Add new columns to existing tables if they don't exist
    migrations = [
        "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entry_rationale TEXT",
        "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS exit_rationale TEXT",
        "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
    ]
    
    for migration in migrations:
        try:
            with get_conn() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(migration)
        except Exception:
            # Column already exists or table doesn't exist
            pass
    
    print("Database schema initialization complete.")


def fetch_all(sql: str, params: Optional[Sequence[Any]] = None) -> List[Dict[str, Any]]:
    """Execute a query and return all rows as dictionaries."""
    # Convert ? placeholders to %s for PostgreSQL
    sql = sql.replace("?", "%s")
    
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params or [])
            rows = cursor.fetchall()
    
    def norm(v: Any) -> Any:
        if isinstance(v, uuid.UUID):
            return str(v)
        return v
    
    return [{k: norm(v) for k, v in row.items()} for row in rows]


def fetch_one(sql: str, params: Optional[Sequence[Any]] = None) -> Optional[Dict[str, Any]]:
    """Execute a query and return the first row as a dictionary, or None if no rows."""
    rows = fetch_all(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: Optional[Sequence[Any]] = None) -> None:
    """Execute a SQL statement (INSERT, UPDATE, DELETE, etc.)."""
    # Convert ? placeholders to %s for PostgreSQL
    sql = sql.replace("?", "%s")
    
    with get_conn() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params or [])

