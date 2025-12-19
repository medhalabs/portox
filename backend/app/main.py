from __future__ import annotations

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

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

# CORS middleware - must be added before exception handlers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_cors_headers(request: Request) -> dict:
    """Get CORS headers if origin is allowed."""
    origin = request.headers.get("origin")
    if origin and origin in settings.cors_origins_list:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    return {}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with CORS headers."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_get_cors_headers(request),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with CORS headers."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers=_get_cors_headers(request),
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions with CORS headers."""
    import traceback
    traceback.print_exc()  # Log the full traceback for debugging
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
        headers=_get_cors_headers(request),
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


