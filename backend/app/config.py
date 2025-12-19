from __future__ import annotations

import os
import secrets
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


_EPHEMERAL_DEV_JWT_SECRET = secrets.token_urlsafe(48)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    env: str = "dev"

    # Computed default: <repo_root>/database/trading_data.duckdb
    duckdb_path: str | None = None

    # Comma-separated origins, e.g. "http://localhost:3000,https://yourdomain.com"
    backend_cors_origins: str = "http://localhost:3000,https://portik.in,https://www.portik.in"

    jwt_secret_key: str | None = None
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # Broker sync (read-only import). These are best-effort defaults and can be overridden.
    zerodha_base_url: str = "https://api.kite.trade"
    zerodha_trades_path: str = "/trades"

    upstox_base_url: str = "https://api.upstox.com/v2"
    upstox_trades_path: str = "/trade/history"

    dhan_base_url: str = "https://api.dhan.co"
    dhan_trades_path: str = "/trades"
    dhan_auth_scheme: str = "Bearer"  # or "access-token"

    # Used to encrypt broker tokens at rest in DuckDB.
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    broker_token_encryption_key: str | None = None

    @property
    def resolved_broker_encryption_key(self) -> str:
        if self.broker_token_encryption_key and self.broker_token_encryption_key.strip():
            return self.broker_token_encryption_key.strip()
        raise RuntimeError("BROKER_TOKEN_ENCRYPTION_KEY is required to use persistent broker connections.")

    @property
    def repo_root(self) -> Path:
        # backend/app/config.py -> backend/app -> backend -> repo_root
        return Path(__file__).resolve().parents[2]

    @property
    def resolved_duckdb_path(self) -> Path:
        if self.duckdb_path:
            return Path(self.duckdb_path).expanduser().resolve()
        return (self.repo_root / "database" / "trading_data.duckdb").resolve()

    @property
    def resolved_jwt_secret(self) -> str:
        if self.jwt_secret_key and self.jwt_secret_key.strip():
            return self.jwt_secret_key.strip()
        # No hardcoded secret: generate an ephemeral secret for local dev.
        # This is intentionally NOT persisted; tokens become invalid on restart.
        if os.getenv("ENV", self.env) != "prod":
            return _EPHEMERAL_DEV_JWT_SECRET
        raise RuntimeError("JWT_SECRET_KEY is required in production.")

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in (self.backend_cors_origins or "").split(",")]
        # Normalize origins: remove trailing slashes and ensure they're valid
        normalized = []
        for origin in origins:
            if origin:
                # Remove trailing slash if present
                origin = origin.rstrip("/")
                normalized.append(origin)
        return normalized


settings = Settings()


