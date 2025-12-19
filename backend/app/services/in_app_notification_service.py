from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.db.duckdb import fetch_all, fetch_one, execute


def create_notification(
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    """Create an in-app notification for a user."""
    notification_id = uuid4()
    metadata_json = None
    if metadata:
        import json
        metadata_json = json.dumps(metadata)
    
    execute(
        """
        INSERT INTO notifications (id, user_id, type, title, message, read, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, false, ?, CURRENT_TIMESTAMP)
        """,
        [
            str(notification_id),
            user_id,
            notification_type,
            title,
            message,
            metadata_json,
        ]
    )


def get_user_notifications(user_id: str, unread_only: bool = False, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get notifications for a user."""
    query = "SELECT * FROM notifications WHERE user_id = ?"
    params = [user_id]
    
    if unread_only:
        query += " AND read = false"
    
    query += " ORDER BY created_at DESC"
    
    if limit:
        query += f" LIMIT {limit}"
    
    rows = fetch_all(query, params)
    
    import json
    notifications = []
    for row in rows:
        notifications.append({
            "id": str(row["id"]),
            "user_id": str(row["user_id"]),
            "type": row["type"],
            "title": row["title"],
            "message": row["message"],
            "read": bool(row.get("read", False)),
            "metadata": json.loads(row["metadata"]) if row.get("metadata") else {},
            "created_at": str(row["created_at"]),
        })
    
    return notifications


def mark_notification_read(notification_id: str, user_id: str) -> bool:
    """Mark a notification as read. Returns True if successful."""
    # Check if notification exists and belongs to user
    notification = fetch_one(
        "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
        [notification_id, user_id]
    )
    if notification:
        execute(
            "UPDATE notifications SET read = true WHERE id = ? AND user_id = ?",
            [notification_id, user_id]
        )
        return True
    return False


def mark_all_read(user_id: str) -> None:
    """Mark all notifications as read for a user."""
    execute(
        "UPDATE notifications SET read = true WHERE user_id = ? AND read = false",
        [user_id]
    )


def delete_notification(notification_id: str, user_id: str) -> bool:
    """Delete a notification. Returns True if successful."""
    notification = fetch_one(
        "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
        [notification_id, user_id]
    )
    if notification:
        execute("DELETE FROM notifications WHERE id = ? AND user_id = ?", [notification_id, user_id])
        return True
    return False


def get_unread_count(user_id: str) -> int:
    """Get count of unread notifications for a user."""
    row = fetch_one(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = false",
        [user_id]
    )
    return int(row["count"]) if row else 0

