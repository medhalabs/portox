# portox — Portfolio & Trade Journal + Portfolio Analytics SaaS

**Disclaimer:** This platform does not provide investment advice. Analytics are for educational purposes only.

## Repo layout (strict separation)

- `frontend/`: Next.js (App Router) UI — **no business/analytics logic**
- `backend/`: FastAPI API — auth, trades, journal, analytics
- `database/`: DuckDB file storage and DB README
- `docs/`: Architecture + API notes

## Local development (recommended)

### 1) Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

### 2) Frontend

```bash
cd frontend
cp env.example .env.local
npm install
npm run dev
```

Frontend will call the backend via `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000`).

## Notes on Unrealized P&L

By default, unrealized P&L is computed using **last trade price per symbol** as the mark price.
For improved accuracy, you can optionally POST marks to:

- `POST /analytics/overview`
- `POST /portfolio/summary`


