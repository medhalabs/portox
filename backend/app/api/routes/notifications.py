from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional

from fastapi import HTTPException, status

from app.auth.dependencies import get_current_user
from app.services.notification_service import (
    get_notification_preferences,
    upsert_notification_preferences,
)
from app.services.in_app_notification_service import (
    get_user_notifications,
    mark_notification_read,
    mark_all_read,
    delete_notification,
    get_unread_count,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationPreferencesUpdate(BaseModel):
    daily_summary_enabled: Optional[bool] = None
    daily_summary_time: Optional[str] = Field(default=None, pattern=r"^\d{2}:\d{2}:\d{2}$")
    journal_reminder_enabled: Optional[bool] = None
    journal_reminder_hours: Optional[int] = Field(default=None, ge=1, le=168)
    milestone_alerts_enabled: Optional[bool] = None
    milestone_thresholds: Optional[Dict[str, Any]] = None
    position_alerts_enabled: Optional[bool] = None
    unrealized_pnl_threshold: Optional[float] = Field(default=None, ge=0)
    email_enabled: Optional[bool] = None


@router.get("/preferences")
def get_preferences(user: dict = Depends(get_current_user)) -> Dict[str, Any]:
    """Get notification preferences for the current user."""
    prefs = get_notification_preferences(str(user["id"]))
    if not prefs:
        # Return defaults
        return {
            "daily_summary_enabled": False,
            "daily_summary_time": "20:00:00",
            "journal_reminder_enabled": False,
            "journal_reminder_hours": 24,
            "milestone_alerts_enabled": False,
            "milestone_thresholds": {},
            "position_alerts_enabled": False,
            "unrealized_pnl_threshold": 0,
            "email_enabled": False,
        }
    return prefs


@router.put("/preferences")
def update_preferences(
    payload: NotificationPreferencesUpdate,
    user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """Update notification preferences for the current user."""
    # Get existing preferences and merge with updates
    existing = get_notification_preferences(str(user["id"]))
    if existing:
        # Merge with existing
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        merged = {**existing, **updates}
    else:
        # Use defaults with updates
        defaults = {
            "daily_summary_enabled": False,
            "daily_summary_time": "20:00:00",
            "journal_reminder_enabled": False,
            "journal_reminder_hours": 24,
            "milestone_alerts_enabled": False,
            "milestone_thresholds": {},
            "position_alerts_enabled": False,
            "unrealized_pnl_threshold": 0,
            "email_enabled": False,
        }
        updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
        merged = {**defaults, **updates}
    
    # Remove id fields before upserting
    merged.pop("id", None)
    merged.pop("user_id", None)
    
    result = upsert_notification_preferences(str(user["id"]), merged)
    return result


@router.get("/in-app")
def get_in_app_notifications(
    unread_only: bool = False,
    limit: Optional[int] = None,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get in-app notifications for the current user."""
    notifications = get_user_notifications(str(user["id"]), unread_only=unread_only, limit=limit)
    unread_count = get_unread_count(str(user["id"]))
    return {
        "notifications": notifications,
        "unread_count": unread_count,
    }


@router.get("/in-app/unread-count")
def get_unread_notification_count(user: dict = Depends(get_current_user)) -> dict:
    """Get count of unread notifications."""
    count = get_unread_count(str(user["id"]))
    return {"unread_count": count}


@router.put("/in-app/{notification_id}/read")
def mark_as_read(notification_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Mark a notification as read."""
    success = mark_notification_read(notification_id, str(user["id"]))
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"success": True}


@router.put("/in-app/read-all")
def mark_all_as_read(user: dict = Depends(get_current_user)) -> dict:
    """Mark all notifications as read."""
    mark_all_read(str(user["id"]))
    return {"success": True}


@router.delete("/in-app/{notification_id}")
def delete_in_app_notification(notification_id: str, user: dict = Depends(get_current_user)) -> dict:
    """Delete a notification."""
    success = delete_notification(notification_id, str(user["id"]))
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return {"success": True}

