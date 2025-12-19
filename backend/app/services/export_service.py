from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd


def export_trades_csv(trades: List[Dict[str, Any]]) -> bytes:
    """Export trades to CSV format"""
    output = io.StringIO()
    if not trades:
        writer = csv.writer(output)
        writer.writerow(["id", "symbol", "side", "quantity", "price", "trade_time", "fees"])
        return output.getvalue().encode("utf-8")

    df = pd.DataFrame(trades)
    # Ensure consistent column order
    columns = ["id", "symbol", "side", "quantity", "price", "trade_time", "fees"]
    df = df[[col for col in columns if col in df.columns]]
    output = io.BytesIO()
    df.to_csv(output, index=False, encoding="utf-8")
    return output.getvalue()


def export_journal_csv(entries: List[Dict[str, Any]]) -> bytes:
    """Export journal entries to CSV format"""
    if not entries:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "trade_id", "strategy", "emotion", "notes", "created_at"])
        return output.getvalue().encode("utf-8")

    df = pd.DataFrame(entries)
    columns = ["id", "trade_id", "strategy", "emotion", "notes", "created_at"]
    df = df[[col for col in columns if col in df.columns]]
    output = io.BytesIO()
    df.to_csv(output, index=False, encoding="utf-8")
    return output.getvalue()


def export_analytics_csv(analytics: Dict[str, Any]) -> bytes:
    """Export analytics overview to CSV format"""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Basic metrics
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Realized P&L", analytics.get("realized_pnl", 0)])
    writer.writerow(["Unrealized P&L", analytics.get("unrealized_pnl", 0)])
    writer.writerow(["Total P&L", analytics.get("total_pnl", 0)])
    writer.writerow(["Win Rate", analytics.get("win_rate", 0)])
    writer.writerow(["Avg Win", analytics.get("avg_win", 0)])
    writer.writerow(["Avg Loss", analytics.get("avg_loss", 0)])
    writer.writerow(["Max Drawdown", analytics.get("drawdown", 0)])
    writer.writerow(["Risk-Reward Ratio", analytics.get("risk_reward_ratio", "")])
    
    # Advanced metrics
    adv = analytics.get("advanced_metrics", {})
    if adv:
        writer.writerow([])
        writer.writerow(["Advanced Metrics"])
        writer.writerow(["Sharpe Ratio", adv.get("sharpe_ratio", "")])
        writer.writerow(["Sortino Ratio", adv.get("sortino_ratio", "")])
        writer.writerow(["Calmar Ratio", adv.get("calmar_ratio", "")])
        writer.writerow(["Profit Factor", adv.get("profit_factor", "")])
        writer.writerow(["Expectancy", adv.get("expectancy", "")])
        writer.writerow(["Avg Holding Period (days)", adv.get("avg_holding_period_days", "")])
    
    # Open positions
    open_positions = analytics.get("open_positions", [])
    if open_positions:
        writer.writerow([])
        writer.writerow(["Open Positions"])
        writer.writerow(["Symbol", "Side", "Quantity", "Avg Cost", "Mark Price", "Unrealized P&L"])
        for pos in open_positions:
            writer.writerow([
                pos.get("symbol", ""),
                pos.get("side", ""),
                pos.get("quantity", 0),
                pos.get("avg_cost", 0),
                pos.get("mark_price", 0),
                pos.get("unrealized_pnl", 0),
            ])
    
    return output.getvalue().encode("utf-8")


def export_trades_excel(trades: List[Dict[str, Any]], journal_by_trade_id: Dict[str, Dict[str, Any]] | None = None) -> bytes:
    """Export trades to Excel format with optional journal data"""
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        # Trades sheet
        df_trades = pd.DataFrame(trades)
        if not df_trades.empty:
            columns = ["id", "symbol", "side", "quantity", "price", "trade_time", "fees"]
            df_trades = df_trades[[col for col in columns if col in df_trades.columns]]
        df_trades.to_excel(writer, sheet_name="Trades", index=False)
        
        # Journal sheet if provided
        if journal_by_trade_id:
            journal_data = [
                {
                    "trade_id": tid,
                    "strategy": data.get("strategy", ""),
                    "emotion": data.get("emotion", ""),
                    "notes": data.get("notes", ""),
                }
                for tid, data in journal_by_trade_id.items()
            ]
            df_journal = pd.DataFrame(journal_data)
            df_journal.to_excel(writer, sheet_name="Journal", index=False)
    
    output.seek(0)
    return output.read()


def export_realized_matches_csv(matches: List[Dict[str, Any]]) -> bytes:
    """Export realized matches (FIFO) to CSV"""
    if not matches:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "symbol", "qty", "entry_trade_id", "exit_trade_id", 
            "entry_price", "exit_price", "entry_time", "exit_time", 
            "side_closed", "pnl"
        ])
        return output.getvalue().encode("utf-8")

    df = pd.DataFrame(matches)
    output = io.BytesIO()
    df.to_csv(output, index=False, encoding="utf-8")
    return output.getvalue()

