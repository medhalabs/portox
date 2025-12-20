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
from app.api.routes import journal_attachments
from app.api.routes.notifications import router as notifications_router
from app.api.routes.portfolio import router as portfolio_router
from app.api.routes.trades import router as trades_router
from app.config import settings
from app.db.postgresql import init_db

DISCLAIMER = "This platform does not provide investment advice. Analytics are for educational purposes only."
VENDOR = "Medhā Labs"

app = FastAPI(
    title="portik API",
    version="0.1.0",
    description=f"{DISCLAIMER}\n\nNo predictions. No buy/sell signals.",
)

# CORS middleware - must be added before exception handlers
# Normalize origins to handle trailing slashes
cors_origins = settings.cors_origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def _get_cors_headers(request: Request) -> dict:
    """Get CORS headers if origin is allowed."""
    origin = request.headers.get("origin")
    if origin:
        # Normalize origin by removing trailing slash
        normalized_origin = origin.rstrip("/")
        # Check if normalized origin is in allowed list
        if normalized_origin in settings.cors_origins_list:
            return {
                "Access-Control-Allow-Origin": normalized_origin,
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
    _start_scheduler()


def _start_scheduler() -> None:
    """Start the background scheduler for notifications."""
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    from app.services.notification_service import (
        send_daily_summaries,
        send_journal_reminders,
        check_milestone_alerts,
        check_position_alerts,
    )
    from app.db.postgresql import fetch_all
    
    scheduler = BackgroundScheduler()
    
    # Schedule daily summaries at a default time (will be user-configurable per user's preference)
    # For now, run at 8 PM daily
    scheduler.add_job(
        send_daily_summaries,
        trigger=CronTrigger(hour=20, minute=0),
        id="daily_summaries",
        replace_existing=True,
    )
    
    # Schedule journal reminders every 6 hours
    scheduler.add_job(
        send_journal_reminders,
        trigger=CronTrigger(hour="*/6"),
        id="journal_reminders",
        replace_existing=True,
    )
    
    # Check milestone and position alerts every hour
    def check_all_alerts():
        """Check alerts for all users."""
        users = fetch_all("SELECT id FROM users")
        for user_row in users:
            user_id = str(user_row["id"])
            check_milestone_alerts(user_id)
            check_position_alerts(user_id)
    
    scheduler.add_job(
        check_all_alerts,
        trigger=CronTrigger(hour="*", minute=0),
        id="check_alerts",
        replace_existing=True,
    )
    
    scheduler.start()
    print("Notification scheduler started")


@app.get("/")
def root() -> dict:
    return {"name": "portik", "vendor": VENDOR, "disclaimer": DISCLAIMER, "version": "0.1.0"}


app.include_router(auth_router)
app.include_router(trades_router)
app.include_router(journal_router)
app.include_router(journal_attachments.router)
app.include_router(portfolio_router)
app.include_router(analytics_router)
app.include_router(brokers_router)
app.include_router(notifications_router)


