# API overview (backend)

All protected endpoints require:

- `Authorization: Bearer <jwt>`

## Auth

- `POST /auth/register` — `{ email, password }`
- `POST /auth/login` — `{ email, password }` → `{ access_token }`

## Trades

- `GET /trades`
- `POST /trades`
- `PUT /trades/{trade_id}`
- `DELETE /trades/{trade_id}`
- `POST /trades/import/csv` (multipart form field: `file`)

## Broker import (read-only)

- `GET /brokers` (supported brokers)
- `GET /brokers/connections` (list saved connections; never returns tokens)
- `POST /brokers/{broker}/connect` (save tokens encrypted at rest)
- `DELETE /brokers/{broker}/disconnect`
- `POST /brokers/{broker}/sync` (imports using saved connection)
- `POST /brokers/{broker}/import`
  - brokers: `zerodha`, `upstox`, `dhan`
  - body:
    - `access_token` (required)
    - `api_key` (required only for `zerodha`)
    - `client_id` (optional for `dhan`, depending on auth scheme)
    - `from_date`, `to_date` (optional; server-side filters)

## Journal

- `GET /journal`
- `POST /journal`
- `PUT /journal/{entry_id}`
- `DELETE /journal/{entry_id}`

## Portfolio

- `GET /portfolio/summary`
- `GET /portfolio/open-positions`

## Analytics

- `GET /analytics/overview`
- `POST /analytics/overview` (optional body: `{ "marks": { "SYMBOL": 123.45 }, "strict": false }`)
- `GET /analytics/realized-matches`
- `GET /analytics/performance`

**Disclaimer:** This platform does not provide investment advice. Analytics are for educational purposes only.


