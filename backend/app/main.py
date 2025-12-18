from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analytics import router as analytics_router
from app.api.routes.auth import router as auth_router
from app.api.routes.brokers import router as brokers_router
from app.api.routes.journal import router as journal_router
from app.api.routes.portfolio import router as portfolio_router
from app.api.routes.trades import router as trades_router
from app.config import settings
from app.db.duckdb import init_db

DISCLAIMER = "This platform does not provide investment advice. Analytics are for educational purposes only."
VENDOR = "Medhā Labs"

app = FastAPI(
    title="portox API",
    version="0.1.0",
    description=f"{DISCLAIMER}\n\nNo predictions. No buy/sell signals.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/")
def root() -> dict:
    return {"name": "portox", "vendor": VENDOR, "disclaimer": DISCLAIMER}


app.include_router(auth_router)
app.include_router(trades_router)
app.include_router(journal_router)
app.include_router(portfolio_router)
app.include_router(analytics_router)
app.include_router(brokers_router)


