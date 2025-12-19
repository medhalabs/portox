from __future__ import annotations

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.config import settings


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """
    Send an email using SMTP.
    
    Returns True if successful, False otherwise.
    """
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password:
        # Email not configured, skip silently
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email or settings.smtp_user}>"
        msg["To"] = to_email

        # Add text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, "plain")
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        # Send email
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False


def format_daily_summary_email(
    user_email: str,
    summary_data: dict,
) -> tuple[str, str]:
    """Format daily summary email content."""
    subject = f"portik Daily Summary - {summary_data.get('date', 'Today')}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #ffbf1f; color: #000; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 20px; }}
            .metric {{ margin: 15px 0; padding: 10px; background-color: white; border-left: 4px solid #ffbf1f; }}
            .metric-label {{ font-weight: bold; color: #666; }}
            .metric-value {{ font-size: 24px; color: #333; }}
            .positive {{ color: #22c55e; }}
            .negative {{ color: #ef4444; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>portik Daily Summary</h1>
                <p>{summary_data.get('date', 'Today')}</p>
            </div>
            <div class="content">
                <div class="metric">
                    <div class="metric-label">Total P&L</div>
                    <div class="metric-value {'positive' if summary_data.get('total_pnl', 0) >= 0 else 'negative'}">
                        ₹{summary_data.get('total_pnl', 0):,.2f}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Realized P&L</div>
                    <div class="metric-value {'positive' if summary_data.get('realized_pnl', 0) >= 0 else 'negative'}">
                        ₹{summary_data.get('realized_pnl', 0):,.2f}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Unrealized P&L</div>
                    <div class="metric-value {'positive' if summary_data.get('unrealized_pnl', 0) >= 0 else 'negative'}">
                        ₹{summary_data.get('unrealized_pnl', 0):,.2f}
                    </div>
                </div>
                <div class="metric">
                    <div class="metric-label">Trades Today</div>
                    <div class="metric-value">{summary_data.get('trades_today', 0)}</div>
                </div>
                <div class="metric">
                    <div class="metric-label">Open Positions</div>
                    <div class="metric-value">{summary_data.get('open_positions_count', 0)}</div>
                </div>
            </div>
            <div class="footer">
                <p>This is an automated email from portik.</p>
                <p>This platform does not provide investment advice. Analytics are for educational purposes only.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
portik Daily Summary - {summary_data.get('date', 'Today')}

Total P&L: ₹{summary_data.get('total_pnl', 0):,.2f}
Realized P&L: ₹{summary_data.get('realized_pnl', 0):,.2f}
Unrealized P&L: ₹{summary_data.get('unrealized_pnl', 0):,.2f}
Trades Today: {summary_data.get('trades_today', 0)}
Open Positions: {summary_data.get('open_positions_count', 0)}

This is an automated email from portik.
This platform does not provide investment advice. Analytics are for educational purposes only.
    """
    
    return subject, html_body, text_body


def format_journal_reminder_email(
    user_email: str,
    trades_to_journal: list[dict],
) -> tuple[str, str]:
    """Format journal reminder email content."""
    subject = f"portik Journal Reminder - {len(trades_to_journal)} trade(s) need journaling"
    
    trades_list = "\n".join([
        f"  - {t.get('symbol', 'N/A')} ({t.get('side', 'N/A')}) on {t.get('trade_time', 'N/A')}"
        for t in trades_to_journal[:10]  # Limit to 10 for email
    ])
    if len(trades_to_journal) > 10:
        trades_list += f"\n  ... and {len(trades_to_journal) - 10} more"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #ffbf1f; color: #000; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 20px; }}
            .trades-list {{ background-color: white; padding: 15px; margin: 15px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Journal Reminder</h1>
            </div>
            <div class="content">
                <p>You have <strong>{len(trades_to_journal)}</strong> trade(s) that haven't been journaled yet:</p>
                <div class="trades-list">
                    <pre style="font-family: Arial, sans-serif;">{trades_list}</pre>
                </div>
                <p>Don't forget to add your strategy, emotions, and notes while they're still fresh in your mind!</p>
            </div>
            <div class="footer">
                <p>This is an automated email from portik.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
portik Journal Reminder

You have {len(trades_to_journal)} trade(s) that haven't been journaled yet:

{trades_list}

Don't forget to add your strategy, emotions, and notes while they're still fresh in your mind!

This is an automated email from portik.
    """
    
    return subject, html_body, text_body


def format_milestone_alert_email(
    user_email: str,
    milestone_type: str,
    milestone_value: float,
    threshold: float,
) -> tuple[str, str]:
    """Format milestone alert email content."""
    subject = f"portik Milestone: {milestone_type.replace('_', ' ').title()}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #22c55e; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 20px; }}
            .milestone {{ background-color: white; padding: 20px; margin: 15px 0; text-align: center; }}
            .milestone-value {{ font-size: 32px; font-weight: bold; color: #22c55e; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Milestone Achieved!</h1>
            </div>
            <div class="content">
                <div class="milestone">
                    <div style="font-size: 18px; color: #666; margin-bottom: 10px;">
                        {milestone_type.replace('_', ' ').title()}
                    </div>
                    <div class="milestone-value">₹{milestone_value:,.2f}</div>
                    <div style="font-size: 14px; color: #666; margin-top: 10px;">
                        Threshold: ₹{threshold:,.2f}
                    </div>
                </div>
                <p>Congratulations on reaching this milestone!</p>
            </div>
            <div class="footer">
                <p>This is an automated email from portik.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
portik Milestone Alert

🎉 Milestone Achieved!

{milestone_type.replace('_', ' ').title()}: ₹{milestone_value:,.2f}
Threshold: ₹{threshold:,.2f}

Congratulations on reaching this milestone!

This is an automated email from portik.
    """
    
    return subject, html_body, text_body


def format_position_alert_email(
    user_email: str,
    symbol: str,
    unrealized_pnl: float,
    threshold: float,
) -> tuple[str, str]:
    """Format position alert email content."""
    is_loss = unrealized_pnl < 0
    subject = f"portik Position Alert: {symbol} P&L {'Loss' if is_loss else 'Gain'}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: {'#ef4444' if is_loss else '#22c55e'}; color: white; padding: 20px; text-align: center; }}
            .content {{ background-color: #f9f9f9; padding: 20px; }}
            .alert {{ background-color: white; padding: 20px; margin: 15px 0; }}
            .alert-value {{ font-size: 28px; font-weight: bold; color: {'#ef4444' if is_loss else '#22c55e'}; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Position Alert: {symbol}</h1>
            </div>
            <div class="content">
                <div class="alert">
                    <div style="font-size: 18px; color: #666; margin-bottom: 10px;">Unrealized P&L</div>
                    <div class="alert-value">₹{unrealized_pnl:,.2f}</div>
                    <div style="font-size: 14px; color: #666; margin-top: 10px;">
                        Threshold: ₹{threshold:,.2f}
                    </div>
                </div>
                <p>Your position in <strong>{symbol}</strong> has reached the alert threshold.</p>
            </div>
            <div class="footer">
                <p>This is an automated email from portik.</p>
                <p>This platform does not provide investment advice. Analytics are for educational purposes only.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
portik Position Alert

Position: {symbol}
Unrealized P&L: ₹{unrealized_pnl:,.2f}
Threshold: ₹{threshold:,.2f}

Your position in {symbol} has reached the alert threshold.

This is an automated email from portik.
This platform does not provide investment advice. Analytics are for educational purposes only.
    """
    
    return subject, html_body, text_body

