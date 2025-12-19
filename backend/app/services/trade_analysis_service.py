from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from typing import Any, Dict, List

from app.services.pnl_service import RealizedMatch, TradeRow, compute_fifo


def calculate_trade_heatmap(trades: List[TradeRow]) -> Dict[str, Any]:
    """
    Calculate P&L heatmap data for calendar view.
    Returns data grouped by year-month-day.
    """
    realized, _, _ = compute_fifo(trades)
    
    # Group by date (YYYY-MM-DD)
    pnl_by_date: Dict[str, float] = defaultdict(float)
    for match in realized:
        date_key = match.exit_time.date().isoformat()
        pnl_by_date[date_key] += float(match.pnl)
    
    # Organize by year -> month -> day
    heatmap_data: Dict[str, Dict[str, Dict[str, float]]] = defaultdict(lambda: defaultdict(dict))
    
    for date_str, pnl in pnl_by_date.items():
        d = date.fromisoformat(date_str)
        year = str(d.year)
        month = str(d.month).zfill(2)
        day = str(d.day).zfill(2)
        heatmap_data[year][month][day] = pnl
    
    # Convert to list format for frontend
    result = []
    for year in sorted(heatmap_data.keys()):
        for month in sorted(heatmap_data[year].keys()):
            for day in sorted(heatmap_data[year][month].keys()):
                result.append({
                    "date": f"{year}-{month}-{day}",
                    "year": int(year),
                    "month": int(month),
                    "day": int(day),
                    "pnl": heatmap_data[year][month][day],
                })
    
    return {
        "heatmap_data": result,
        "date_range": {
            "min": min(pnl_by_date.keys()) if pnl_by_date else None,
            "max": max(pnl_by_date.keys()) if pnl_by_date else None,
        },
    }


def calculate_time_of_day_analysis(trades: List[TradeRow]) -> Dict[str, Any]:
    """
    Analyze P&L by hour of day (entry and exit times).
    """
    realized, _, _ = compute_fifo(trades)
    
    # Analyze by entry hour and exit hour
    entry_hour_pnl: Dict[int, List[float]] = defaultdict(list)
    exit_hour_pnl: Dict[int, List[float]] = defaultdict(list)
    
    for match in realized:
        entry_hour = match.entry_time.hour
        exit_hour = match.exit_time.hour
        pnl_val = float(match.pnl)
        
        entry_hour_pnl[entry_hour].append(pnl_val)
        exit_hour_pnl[exit_hour].append(pnl_val)
    
    # Calculate statistics per hour
    entry_stats = []
    exit_stats = []
    
    for hour in range(24):
        entry_pnls = entry_hour_pnl.get(hour, [])
        exit_pnls = exit_hour_pnl.get(hour, [])
        
        entry_stats.append({
            "hour": hour,
            "total_pnl": sum(entry_pnls),
            "avg_pnl": sum(entry_pnls) / len(entry_pnls) if entry_pnls else 0,
            "count": len(entry_pnls),
            "wins": len([p for p in entry_pnls if p > 0]),
            "losses": len([p for p in entry_pnls if p < 0]),
        })
        
        exit_stats.append({
            "hour": hour,
            "total_pnl": sum(exit_pnls),
            "avg_pnl": sum(exit_pnls) / len(exit_pnls) if exit_pnls else 0,
            "count": len(exit_pnls),
            "wins": len([p for p in exit_pnls if p > 0]),
            "losses": len([p for p in exit_pnls if p < 0]),
        })
    
    return {
        "by_entry_hour": entry_stats,
        "by_exit_hour": exit_stats,
    }


def calculate_symbol_performance_matrix(trades: List[TradeRow]) -> Dict[str, Any]:
    """
    Calculate performance matrix by symbol with various metrics.
    """
    realized, _, _ = compute_fifo(trades)
    
    # Group by symbol
    symbol_data: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "pnl": 0.0,
        "trades": 0,
        "wins": 0,
        "losses": 0,
        "win_pnl": 0.0,
        "loss_pnl": 0.0,
        "avg_win": 0.0,
        "avg_loss": 0.0,
    })
    
    for match in realized:
        sym = match.symbol
        pnl_val = float(match.pnl)
        
        symbol_data[sym]["pnl"] += pnl_val
        symbol_data[sym]["trades"] += 1
        
        if pnl_val > 0:
            symbol_data[sym]["wins"] += 1
            symbol_data[sym]["win_pnl"] += pnl_val
        elif pnl_val < 0:
            symbol_data[sym]["losses"] += 1
            symbol_data[sym]["loss_pnl"] += pnl_val
    
    # Calculate averages and win rates
    matrix = []
    for symbol, data in symbol_data.items():
        win_rate = data["wins"] / data["trades"] if data["trades"] > 0 else 0
        avg_win = data["win_pnl"] / data["wins"] if data["wins"] > 0 else 0
        avg_loss = data["loss_pnl"] / data["losses"] if data["losses"] > 0 else 0
        
        matrix.append({
            "symbol": symbol,
            "total_pnl": data["pnl"],
            "trades": data["trades"],
            "wins": data["wins"],
            "losses": data["losses"],
            "win_rate": win_rate,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": abs(avg_win / avg_loss) if avg_loss != 0 else None,
        })
    
    # Sort by total P&L
    matrix.sort(key=lambda x: x["total_pnl"], reverse=True)
    
    return {
        "symbols": matrix,
    }


def calculate_strategy_comparison_matrix(trades: List[TradeRow], journal_by_trade_id: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate performance matrix by strategy (from journal entries).
    """
    realized, _, _ = compute_fifo(trades)
    
    # Group by strategy
    strategy_data: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "pnl": 0.0,
        "trades": 0,
        "wins": 0,
        "losses": 0,
        "win_pnl": 0.0,
        "loss_pnl": 0.0,
    })
    
    # Map entry/exit trade IDs to strategies
    for match in realized:
        # Try to get strategy from entry trade journal
        strategy = journal_by_trade_id.get(match.entry_trade_id, {}).get("strategy", "Unknown")
        if not strategy or strategy.strip() == "":
            strategy = "Unknown"
        
        pnl_val = float(match.pnl)
        
        strategy_data[strategy]["pnl"] += pnl_val
        strategy_data[strategy]["trades"] += 1
        
        if pnl_val > 0:
            strategy_data[strategy]["wins"] += 1
            strategy_data[strategy]["win_pnl"] += pnl_val
        elif pnl_val < 0:
            strategy_data[strategy]["losses"] += 1
            strategy_data[strategy]["loss_pnl"] += pnl_val
    
    # Calculate metrics
    matrix = []
    for strategy, data in strategy_data.items():
        win_rate = data["wins"] / data["trades"] if data["trades"] > 0 else 0
        avg_win = data["win_pnl"] / data["wins"] if data["wins"] > 0 else 0
        avg_loss = data["loss_pnl"] / data["losses"] if data["losses"] > 0 else 0
        
        matrix.append({
            "strategy": strategy,
            "total_pnl": data["pnl"],
            "trades": data["trades"],
            "wins": data["wins"],
            "losses": data["losses"],
            "win_rate": win_rate,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": abs(avg_win / avg_loss) if avg_loss != 0 else None,
        })
    
    # Sort by total P&L
    matrix.sort(key=lambda x: x["total_pnl"], reverse=True)
    
    return {
        "strategies": matrix,
    }


def calculate_win_loss_distribution(trades: List[TradeRow]) -> Dict[str, Any]:
    """
    Calculate win/loss distribution with histograms.
    """
    realized, _, _ = compute_fifo(trades)
    
    wins = [float(m.pnl) for m in realized if m.pnl > 0]
    losses = [float(m.pnl) for m in realized if m.pnl < 0]
    
    # Create bins for distribution
    all_pnls = wins + losses
    if not all_pnls:
        return {
            "wins": [],
            "losses": [],
            "bins": [],
        }
    
    min_pnl = min(all_pnls)
    max_pnl = max(all_pnls)
    
    # Create 20 bins
    num_bins = 20
    bin_size = (max_pnl - min_pnl) / num_bins if max_pnl != min_pnl else 1
    
    win_bins = [0] * num_bins
    loss_bins = [0] * num_bins
    bin_labels = []
    
    for i in range(num_bins):
        bin_start = min_pnl + (i * bin_size)
        bin_end = min_pnl + ((i + 1) * bin_size)
        bin_labels.append(f"{bin_start:.0f} to {bin_end:.0f}")
        
        for win in wins:
            if bin_start <= win < bin_end or (i == num_bins - 1 and win >= bin_end):
                win_bins[i] += 1
        
        for loss in losses:
            if bin_start <= loss < bin_end or (i == num_bins - 1 and loss >= bin_end):
                loss_bins[i] += 1
    
    # Format for charts
    distribution_data = []
    for i in range(num_bins):
        distribution_data.append({
            "bin": bin_labels[i],
            "wins": win_bins[i],
            "losses": abs(loss_bins[i]),  # Make positive for charting
            "bin_index": i,
        })
    
    return {
        "distribution": distribution_data,
        "summary": {
            "total_wins": len(wins),
            "total_losses": len(losses),
            "avg_win": sum(wins) / len(wins) if wins else 0,
            "avg_loss": sum(losses) / len(losses) if losses else 0,
            "max_win": max(wins) if wins else 0,
            "max_loss": min(losses) if losses else 0,  # Most negative
        },
    }

