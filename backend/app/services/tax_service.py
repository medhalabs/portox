from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List

from app.services.pnl_service import RealizedMatch


def calculate_tax_classification(
    realized_matches: List[RealizedMatch],
    tax_year: int,
    long_term_days: int = 365,
    short_term_tax_rate: float = 15.0,
    long_term_tax_rate: float = 10.0,
) -> Dict[str, Any]:
    """
    Classify realized trades into short-term and long-term capital gains/losses.
    
    Args:
        realized_matches: List of realized trade matches
        tax_year: Tax year to filter (e.g., 2024)
        long_term_days: Number of days for long-term classification (default 365)
    
    Returns:
        Dictionary with tax classification breakdown
    """
    short_term_gains: List[Dict[str, Any]] = []
    short_term_losses: List[Dict[str, Any]] = []
    long_term_gains: List[Dict[str, Any]] = []
    long_term_losses: List[Dict[str, Any]] = []

    for match in realized_matches:
        # Filter by tax year (based on exit time)
        exit_date = match.exit_time.date()
        if exit_date.year != tax_year:
            continue

        holding_days = (match.exit_time - match.entry_time).days
        is_long_term = holding_days >= long_term_days

        match_data = {
            "symbol": match.symbol,
            "qty": match.qty,
            "entry_time": match.entry_time.isoformat(),
            "exit_time": match.exit_time.isoformat(),
            "entry_price": float(match.entry_price),
            "exit_price": float(match.exit_price),
            "pnl": float(match.pnl),
            "holding_days": holding_days,
            "entry_trade_id": match.entry_trade_id,
            "exit_trade_id": match.exit_trade_id,
        }

        if match.pnl > 0:
            if is_long_term:
                long_term_gains.append(match_data)
            else:
                short_term_gains.append(match_data)
        elif match.pnl < 0:
            if is_long_term:
                long_term_losses.append(match_data)
            else:
                short_term_losses.append(match_data)

    # Calculate totals
    short_term_gain_total = sum(m["pnl"] for m in short_term_gains)
    short_term_loss_total = sum(m["pnl"] for m in short_term_losses)
    long_term_gain_total = sum(m["pnl"] for m in long_term_gains)
    long_term_loss_total = sum(m["pnl"] for m in long_term_losses)

    # Net calculations (only positive net gains are taxable)
    net_short_term = short_term_gain_total + short_term_loss_total
    net_long_term = long_term_gain_total + long_term_loss_total
    net_total = net_short_term + net_long_term

    # Calculate taxes (only on gains, losses offset gains)
    # Tax is calculated on net gains (if positive)
    short_term_taxable_gain = max(0, net_short_term)
    long_term_taxable_gain = max(0, net_long_term)
    
    short_term_tax = (short_term_taxable_gain * short_term_tax_rate) / 100.0
    long_term_tax = (long_term_taxable_gain * long_term_tax_rate) / 100.0
    total_tax = short_term_tax + long_term_tax

    # Tax loss harvesting opportunities (losses that could offset gains)
    tax_loss_harvesting = []
    if short_term_loss_total < 0 and short_term_gain_total > 0:
        tax_loss_harvesting.append({
            "type": "short_term",
            "available_loss": abs(short_term_loss_total),
            "could_offset": "short_term_gains",
        })
    if long_term_loss_total < 0 and long_term_gain_total > 0:
        tax_loss_harvesting.append({
            "type": "long_term",
            "available_loss": abs(long_term_loss_total),
            "could_offset": "long_term_gains",
        })

    return {
        "tax_year": tax_year,
        "short_term": {
            "gains": short_term_gains,
            "losses": short_term_losses,
            "total_gains": float(short_term_gain_total),
            "total_losses": float(short_term_loss_total),
            "net": float(net_short_term),
            "count": len(short_term_gains) + len(short_term_losses),
        },
        "long_term": {
            "gains": long_term_gains,
            "losses": long_term_losses,
            "total_gains": float(long_term_gain_total),
            "total_losses": float(long_term_loss_total),
            "net": float(net_long_term),
            "count": len(long_term_gains) + len(long_term_losses),
        },
        "summary": {
            "total_realized_pnl": float(net_total),
            "net_short_term": float(net_short_term),
            "net_long_term": float(net_long_term),
            "short_term_taxable_gain": float(short_term_taxable_gain),
            "long_term_taxable_gain": float(long_term_taxable_gain),
            "short_term_tax": float(short_term_tax),
            "long_term_tax": float(long_term_tax),
            "total_tax": float(total_tax),
        },
        "tax_rates": {
            "short_term_rate": float(short_term_tax_rate),
            "long_term_rate": float(long_term_tax_rate),
        },
        "tax_loss_harvesting": tax_loss_harvesting,
        "notes": {
            "long_term_threshold_days": long_term_days,
            "disclaimer": "This is for informational purposes only. Consult a tax professional for tax advice.",
        },
    }


def get_tax_year_summary(realized_matches: List[RealizedMatch]) -> Dict[int, Dict[str, float]]:
    """Get summary of realized P&L by tax year"""
    by_year: Dict[int, Dict[str, float]] = {}
    
    for match in realized_matches:
        year = match.exit_time.date().year
        if year not in by_year:
            by_year[year] = {"realized_pnl": 0.0, "count": 0}
        by_year[year]["realized_pnl"] += float(match.pnl)
        by_year[year]["count"] += 1
    
    return by_year

