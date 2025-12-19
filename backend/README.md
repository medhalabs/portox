# portik backend (FastAPI)

**Disclaimer:** This platform does not provide investment advice. Analytics are for educational purposes only.

## Quickstart

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

OpenAPI docs:

- `http://localhost:8000/docs`


