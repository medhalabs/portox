# Architecture (portox)

**Hard constraint:** frontend, backend, and database logic are isolated in separate folders. No shared modules.

## High-level flow

- Next.js UI authenticates with `POST /auth/login` and stores JWT **client-side only**.
- UI sends JWT via `Authorization: Bearer <token>` to all protected endpoints.
- FastAPI persists users/trades/journal entries in DuckDB (`database/trading_data.duckdb`).
- All analytics (P&L, drawdown, risk metrics, time buckets) are computed server-side and returned via API.

## Extendability

- DuckDB is used for local analytics + single-file storage; migrate later to Postgres by replacing the DB adapter layer (`backend/app/db/`).
- Broker API sync is intentionally not included in this phase.


