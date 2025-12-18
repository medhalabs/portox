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
    backend_cors_origins: str = "http://localhost:3000"

    jwt_secret_key: str | None = None
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

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
        return [o for o in origins if o]


settings = Settings()


