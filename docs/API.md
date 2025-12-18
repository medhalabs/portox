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


