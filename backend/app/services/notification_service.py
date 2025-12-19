from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.db.duckdb import fetch_all, fetch_one, execute
from app.services.email_service import (
    send_email,
    format_daily_summary_email,
    format_journal_reminder_email,
    format_milestone_alert_email,
    format_position_alert_email,
)
from app.services.analytics_service import overview_from_trades
from app.services.pnl_service import TradeRow
from app.db.duckdb import fetch_all as db_fetch_all
from app.services.in_app_notification_service import create_notification


def _load_trades_for_notifications(user_id: str) -> list[TradeRow]:
    """Load trades for a user (similar to analytics._load_trades but standalone)."""
    rows = db_fetch_all(
        "SELECT id, user_id, symbol, side, quantity, price, trade_time, fees FROM trades WHERE user_id = ? ORDER BY trade_time ASC",
        [user_id]
    )
    return [TradeRow(**r) for r in rows]  # type: ignore[arg-type]


def get_notification_preferences(user_id: str) -> Optional[Dict[str, Any]]:
    """Get notification preferences for a user."""
    row = fetch_one(
        "SELECT * FROM notification_preferences WHERE user_id = ?",
        [user_id]
    )
    if not row:
        return None
    
    import json
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "daily_summary_enabled": bool(row.get("daily_summary_enabled", False)),
        "daily_summary_time": str(row.get("daily_summary_time", "20:00:00")),
        "journal_reminder_enabled": bool(row.get("journal_reminder_enabled", False)),
        "journal_reminder_hours": int(row.get("journal_reminder_hours", 24)),
        "milestone_alerts_enabled": bool(row.get("milestone_alerts_enabled", False)),
        "milestone_thresholds": json.loads(row.get("milestone_thresholds", "{}")) if row.get("milestone_thresholds") else {},
        "position_alerts_enabled": bool(row.get("position_alerts_enabled", False)),
        "unrealized_pnl_threshold": float(row.get("unrealized_pnl_threshold", 0)),
        "email_enabled": bool(row.get("email_enabled", False)),
    }


def upsert_notification_preferences(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update notification preferences."""
    from uuid import uuid4
    import json
    
    existing = get_notification_preferences(user_id)
    
    milestone_thresholds_json = json.dumps(preferences.get("milestone_thresholds", {}))
    
    if existing:
        # Update existing
        execute(
            """
            UPDATE notification_preferences
            SET daily_summary_enabled = ?,
                daily_summary_time = ?,
                journal_reminder_enabled = ?,
                journal_reminder_hours = ?,
                milestone_alerts_enabled = ?,
                milestone_thresholds = ?,
                position_alerts_enabled = ?,
                unrealized_pnl_threshold = ?,
                email_enabled = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            [
                preferences.get("daily_summary_enabled", False),
                preferences.get("daily_summary_time", "20:00:00"),
                preferences.get("journal_reminder_enabled", False),
                preferences.get("journal_reminder_hours", 24),
                preferences.get("milestone_alerts_enabled", False),
                milestone_thresholds_json,
                preferences.get("position_alerts_enabled", False),
                preferences.get("unrealized_pnl_threshold", 0),
                preferences.get("email_enabled", False),
                user_id,
            ]
        )
        return get_notification_preferences(user_id) or {}
    else:
        # Create new
        prefs_id = uuid4()
        execute(
            """
            INSERT INTO notification_preferences (
                id, user_id, daily_summary_enabled, daily_summary_time,
                journal_reminder_enabled, journal_reminder_hours,
                milestone_alerts_enabled, milestone_thresholds,
                position_alerts_enabled, unrealized_pnl_threshold,
                email_enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            [
                str(prefs_id),
                user_id,
                preferences.get("daily_summary_enabled", False),
                preferences.get("daily_summary_time", "20:00:00"),
                preferences.get("journal_reminder_enabled", False),
                preferences.get("journal_reminder_hours", 24),
                preferences.get("milestone_alerts_enabled", False),
                milestone_thresholds_json,
                preferences.get("position_alerts_enabled", False),
                preferences.get("unrealized_pnl_threshold", 0),
                preferences.get("email_enabled", False),
            ]
        )
        return get_notification_preferences(user_id) or {}


def get_user_email(user_id: str) -> Optional[str]:
    """Get user email address."""
    row = fetch_one("SELECT email FROM users WHERE id = ?", [user_id])
    return row["email"] if row else None


def send_daily_summaries() -> None:
    """Send daily summary emails to all users who have it enabled."""
    # Get all users with daily summary enabled
    rows = fetch_all(
        """
        SELECT np.user_id, np.daily_summary_time, u.email
        FROM notification_preferences np
        JOIN users u ON np.user_id = u.id
        WHERE np.daily_summary_enabled = true AND np.email_enabled = true
        """
    )
    
    for row in rows:
        user_id = str(row["user_id"])
        user_email = row["email"]
        
        try:
            # Get today's analytics
            trades = _load_trades_for_notifications(user_id)
            analytics = overview_from_trades(trades)
            
            # Get today's trades count
            today = date.today()
            today_trades = fetch_one(
                """
                SELECT COUNT(*) as count
                FROM trades
                WHERE user_id = ? AND DATE(trade_time) = ?
                """,
                [user_id, today.isoformat()]
            )
            
            summary_data = {
                "date": today.strftime("%Y-%m-%d"),
                "total_pnl": analytics.get("total_pnl", 0),
                "realized_pnl": analytics.get("realized_pnl", 0),
                "unrealized_pnl": analytics.get("unrealized_pnl", 0),
                "trades_today": int(today_trades["count"]) if today_trades else 0,
                "open_positions_count": len(analytics.get("open_positions", [])),
            }
            
            subject, html_body, text_body = format_daily_summary_email(user_email, summary_data)
            send_email(user_email, subject, html_body, text_body)
        except Exception as e:
            print(f"Failed to send daily summary to {user_email}: {e}")


def send_journal_reminders() -> None:
    """Send journal reminders to users who have trades without journal entries."""
    # Get all users with journal reminders enabled
    rows = fetch_all(
        """
        SELECT np.user_id, np.journal_reminder_hours, u.email
        FROM notification_preferences np
        JOIN users u ON np.user_id = u.id
        WHERE np.journal_reminder_enabled = true AND np.email_enabled = true
        """
    )
    
    for row in rows:
        user_id = str(row["user_id"])
        user_email = row["email"]
        reminder_hours = int(row["journal_reminder_hours"])
        
        try:
            # Find trades without journal entries older than reminder_hours
            cutoff_time = datetime.now() - timedelta(hours=reminder_hours)
            trades_without_journal = fetch_all(
                """
                SELECT t.id, t.symbol, t.side, t.trade_time
                FROM trades t
                LEFT JOIN journal_entries je ON t.id = je.trade_id
                WHERE t.user_id = ? 
                  AND je.id IS NULL
                  AND t.trade_time < ?
                ORDER BY t.trade_time DESC
                """,
                [user_id, cutoff_time.isoformat()]
            )
            
            if trades_without_journal:
                trades_list = [
                    {
                        "symbol": t["symbol"],
                        "side": t["side"],
                        "trade_time": str(t["trade_time"]),
                    }
                    for t in trades_without_journal
                ]
                
                # Get preferences to check email_enabled
                prefs = get_notification_preferences(user_id)
                
                # Send email if enabled
                if prefs and prefs.get("email_enabled"):
                    subject, html_body, text_body = format_journal_reminder_email(user_email, trades_list)
                    send_email(user_email, subject, html_body, text_body)
                
                # Create in-app notification (always, if journal reminders enabled)
                create_notification(
                    user_id,
                    "journal_reminder",
                    "Journal Reminder",
                    f"You have {len(trades_without_journal)} trade(s) that haven't been journaled yet",
                    {"trades_count": len(trades_without_journal), "trades": trades_list[:5]}  # Store first 5
                )
        except Exception as e:
            print(f"Failed to send journal reminder to {user_email}: {e}")


def check_milestone_alerts(user_id: str) -> None:
    """Check and send milestone alerts for a user."""
    prefs = get_notification_preferences(user_id)
    if not prefs or not prefs.get("milestone_alerts_enabled"):
        return
    
    user_email = get_user_email(user_id)
    
    try:
        trades = _load_trades_for_notifications(user_id)
        analytics = overview_from_trades(trades)
        
        thresholds = prefs.get("milestone_thresholds", {})
        total_pnl = analytics.get("total_pnl", 0)
        
        # Check total P&L milestones
        if "total_pnl" in thresholds:
            for threshold in thresholds["total_pnl"]:
                if total_pnl >= threshold:
                    # Send email if enabled
                    if prefs.get("email_enabled"):
                        subject, html_body, text_body = format_milestone_alert_email(
                            user_email, "total_pnl", total_pnl, threshold
                        )
                        send_email(user_email, subject, html_body, text_body)
                    
                    # Create in-app notification (always, if milestone alerts enabled)
                    create_notification(
                        user_id,
                        "milestone",
                        "🎉 Milestone Achieved!",
                        f"Your total P&L has reached ₹{total_pnl:,.2f} (threshold: ₹{threshold:,.2f})",
                        {"milestone_type": "total_pnl", "value": total_pnl, "threshold": threshold}
                    )
                    # Only alert once per threshold (could be improved with tracking)
                    break
        
        # Check win streak milestones (if implemented)
        if "win_streak" in thresholds:
            # This would require additional analytics calculation
            pass
    except Exception as e:
        print(f"Failed to check milestones for user {user_id}: {e}")


def check_position_alerts(user_id: str) -> None:
    """Check and send position alerts for a user."""
    prefs = get_notification_preferences(user_id)
    if not prefs or not prefs.get("position_alerts_enabled"):
        return
    
    threshold = abs(prefs.get("unrealized_pnl_threshold", 0))
    if threshold <= 0:
        return
    
    user_email = get_user_email(user_id)
    
    try:
        trades = _load_trades_for_notifications(user_id)
        analytics = overview_from_trades(trades)
        
        open_positions = analytics.get("open_positions", [])
        for position in open_positions:
            unrealized_pnl = position.get("unrealized_pnl", 0)
            symbol = position.get("symbol", "UNKNOWN")
            if abs(unrealized_pnl) >= threshold:
                # Send email if enabled
                if prefs.get("email_enabled") and user_email:
                    subject, html_body, text_body = format_position_alert_email(
                        user_email,
                        symbol,
                        unrealized_pnl,
                        threshold,
                    )
                    send_email(user_email, subject, html_body, text_body)
                
                # Create in-app notification (always, if position alerts enabled)
                is_loss = unrealized_pnl < 0
                create_notification(
                    user_id,
                    "position_alert",
                    f"Position Alert: {symbol}",
                    f"Unrealized P&L: ₹{unrealized_pnl:,.2f} (threshold: ₹{threshold:,.2f})",
                    {"symbol": symbol, "unrealized_pnl": unrealized_pnl, "threshold": threshold}
                )
                # Alert once per position (could be improved with tracking)
    except Exception as e:
        print(f"Failed to check position alerts for user {user_id}: {e}")

