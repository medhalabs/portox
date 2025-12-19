from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any, Dict, List

from app.services.pnl_service import TradeRow, compute_fifo, compute_unrealized
from app.utils.calculations import (
    EquityPoint,
    bucket_hour,
    bucket_weekday,
    max_drawdown,
    sharpe_ratio,
    sortino_ratio,
    calmar_ratio,
    profit_factor,
    expectancy,
    average_holding_period,
)


def _normalize_marks(marks: Dict[str, float] | None) -> Dict[str, float]:
    if not marks:
        return {}
    return {str(k).upper().strip(): float(v) for k, v in marks.items()}


def overview_from_trades(trades: List[TradeRow], marks: Dict[str, float] | None = None, strict: bool = False) -> Dict[str, Any]:
    realized, positions, last_trade_mark = compute_fifo(trades)
    marks_norm = _normalize_marks(marks)

    # Effective mark uses provided marks when available, otherwise falls back to last trade price.
    effective_mark = dict(last_trade_mark)
    effective_mark.update({k: v for k, v in marks_norm.items() if v > 0})

    unrealized_by_symbol = compute_unrealized(positions, effective_mark)

    realized_pnl = float(sum(m.pnl for m in realized))
    unrealized_pnl = float(sum(unrealized_by_symbol.values()))
    total_pnl = realized_pnl + unrealized_pnl

    wins = [m.pnl for m in realized if m.pnl > 0]
    losses = [m.pnl for m in realized if m.pnl < 0]

    win_rate = float(len(wins) / max(1, (len(wins) + len(losses))))
    avg_win = float(sum(wins) / max(1, len(wins)))
    avg_loss = float(sum(losses) / max(1, len(losses)))  # negative or 0
    risk_reward = float(avg_win / abs(avg_loss)) if avg_loss < 0 else None

    # Sort realized matches by exit time (needed for equity curve and advanced metrics)
    realized_sorted = sorted(realized, key=lambda m: m.exit_time)
    
    # Equity curve based on realized exits
    equity_points: List[EquityPoint] = []
    cum = 0.0
    for m in realized_sorted:
        cum += float(m.pnl)
        equity_points.append(EquityPoint(t=m.exit_time, equity=cum))
    drawdown = float(max_drawdown(equity_points)) if equity_points else 0.0

    # Advanced risk metrics
    gross_profit = float(sum(wins)) if wins else 0.0
    gross_loss = float(sum(losses)) if losses else 0.0
    profit_factor_val = profit_factor(gross_profit, gross_loss)
    expectancy_val = expectancy(wins, losses, win_rate)

    # Calculate daily returns for Sharpe/Sortino (using realized matches by exit date)
    daily_returns: List[float] = []
    holding_periods: List[float] = []
    
    for m in realized_sorted:
        daily_returns.append(float(m.pnl))
        holding_periods.append((m.exit_time - m.entry_time).total_seconds() / 86400.0)

    sharpe = sharpe_ratio(daily_returns) if daily_returns else None
    sortino = sortino_ratio(daily_returns) if daily_returns else None
    calmar = calmar_ratio(realized_pnl, drawdown) if drawdown > 0 else None
    avg_holding_period_days = float(sum(holding_periods) / len(holding_periods)) if holding_periods else None

    # Time buckets (exit time)
    pnl_by_hour: Dict[int, float] = defaultdict(float)
    pnl_by_weekday: Dict[int, float] = defaultdict(float)
    for m in realized_sorted:
        pnl_by_hour[bucket_hour(m.exit_time)] += float(m.pnl)
        pnl_by_weekday[bucket_weekday(m.exit_time)] += float(m.pnl)

    # Open positions summary
    open_positions: List[Dict[str, Any]] = []
    open_symbols: List[str] = []
    for sym, lots in positions.items():
        px = float(effective_mark.get(sym, 0.0))

        long_qty = sum(l.qty for l in lots["long"])
        short_qty = sum(l.qty for l in lots["short"])

        if long_qty:
            open_symbols.append(sym)
            avg_cost = sum((l.price + l.fee_per_share) * l.qty for l in lots["long"]) / float(long_qty)
            open_positions.append(
                {
                    "symbol": sym,
                    "side": "LONG",
                    "quantity": int(long_qty),
                    "avg_cost": float(avg_cost),
                    "mark_price": float(px),
                    "unrealized_pnl": float(unrealized_by_symbol.get(sym, 0.0)),
                }
            )
        if short_qty:
            open_symbols.append(sym)
            avg_entry = sum((l.price - l.fee_per_share) * l.qty for l in lots["short"]) / float(short_qty)
            open_positions.append(
                {
                    "symbol": sym,
                    "side": "SHORT",
                    "quantity": int(short_qty),
                    "avg_cost": float(avg_entry),
                    "mark_price": float(px),
                    "unrealized_pnl": float(unrealized_by_symbol.get(sym, 0.0)),
                }
            )

    missing_marks = sorted({s for s in open_symbols if s not in marks_norm})
    if strict and missing_marks:
        raise ValueError(f"Missing marks for open symbols: {', '.join(missing_marks)}")

    return {
        "realized_pnl": realized_pnl,
        "unrealized_pnl": unrealized_pnl,
        "total_pnl": total_pnl,
        "win_rate": win_rate,
        "avg_win": avg_win,
        "avg_loss": avg_loss,
        "drawdown": drawdown,
        "risk_reward_ratio": risk_reward,
        "advanced_metrics": {
            "sharpe_ratio": float(sharpe) if sharpe is not None else None,
            "sortino_ratio": float(sortino) if sortino is not None else None,
            "calmar_ratio": float(calmar) if calmar is not None else None,
            "profit_factor": float(profit_factor_val) if profit_factor_val is not None else None,
            "expectancy": float(expectancy_val) if expectancy_val is not None else None,
            "avg_holding_period_days": float(avg_holding_period_days) if avg_holding_period_days is not None else None,
        },
        "time_buckets": {
            "pnl_by_hour": {int(k): float(v) for k, v in sorted(pnl_by_hour.items())},
            "pnl_by_weekday": {int(k): float(v) for k, v in sorted(pnl_by_weekday.items())},
        },
        "open_positions": open_positions,
        "notes": {
            "mark_price_source": "provided_marks_with_fallback_to_last_trade",
            "missing_marks": missing_marks,
            "no_investment_advice": True,
        },
    }


def realized_matches(trades: List[TradeRow]) -> List[Dict[str, Any]]:
    realized, _, _ = compute_fifo(trades)
    return [
        {
            "symbol": m.symbol,
            "qty": int(m.qty),
            "entry_trade_id": m.entry_trade_id,
            "exit_trade_id": m.exit_trade_id,
            "entry_price": float(m.entry_price),
            "exit_price": float(m.exit_price),
            "entry_time": m.entry_time,
            "exit_time": m.exit_time,
            "side_closed": m.side_closed,
            "pnl": float(m.pnl),
        }
        for m in sorted(realized, key=lambda x: x.exit_time)
    ]


def performance_from_trades(
    trades: List[TradeRow],
    journal_by_trade_id: Dict[str, Dict[str, Any]] | None = None,
) -> Dict[str, Any]:
    """
    Performance insights based on realized matches (FIFO), attributed to the EXIT trade by default.
    journal_by_trade_id can provide tags like strategy/emotion for breakdowns.
    """
    journal_by_trade_id = journal_by_trade_id or {}
    realized, _, _ = compute_fifo(trades)
    realized_sorted = sorted(realized, key=lambda m: m.exit_time)

    # Daily realized pnl
    pnl_by_day: Dict[date, float] = defaultdict(float)
    equity_by_day: Dict[date, float] = defaultdict(float)
    cum = 0.0
    for m in realized_sorted:
        d = m.exit_time.date()
        pnl_by_day[d] += float(m.pnl)

    for d in sorted(pnl_by_day.keys()):
        cum += pnl_by_day[d]
        equity_by_day[d] = cum

    daily_series = [{"date": d.isoformat(), "pnl": float(pnl_by_day[d])} for d in sorted(pnl_by_day.keys())]
    equity_series = [{"date": d.isoformat(), "equity": float(equity_by_day[d])} for d in sorted(equity_by_day.keys())]

    # Weekly realized pnl (ISO week)
    pnl_by_week: Dict[str, float] = defaultdict(float)
    for m in realized_sorted:
        y, w, _ = m.exit_time.isocalendar()
        key = f"{y}-W{int(w):02d}"
        pnl_by_week[key] += float(m.pnl)
    weekly_series = [{"week": k, "pnl": float(v)} for k, v in sorted(pnl_by_week.items())]

    # Streaks (based on realized match sign)
    max_win_streak = 0
    max_loss_streak = 0
    cur_win = 0
    cur_loss = 0
    for m in realized_sorted:
        if m.pnl > 0:
            cur_win += 1
            cur_loss = 0
        elif m.pnl < 0:
            cur_loss += 1
            cur_win = 0
        else:
            cur_win = 0
            cur_loss = 0
        max_win_streak = max(max_win_streak, cur_win)
        max_loss_streak = max(max_loss_streak, cur_loss)

    # Best/worst day
    best_day = None
    worst_day = None
    if pnl_by_day:
        best_d = max(pnl_by_day, key=lambda k: pnl_by_day[k])
        worst_d = min(pnl_by_day, key=lambda k: pnl_by_day[k])
        best_day = {"date": best_d.isoformat(), "pnl": float(pnl_by_day[best_d])}
        worst_day = {"date": worst_d.isoformat(), "pnl": float(pnl_by_day[worst_d])}

    # Breakdowns
    def _group_stats() -> Dict[str, Dict[str, Any]]:
        return defaultdict(lambda: {"pnl": 0.0, "wins": 0, "losses": 0, "matches": 0})

    by_symbol = _group_stats()
    by_strategy = _group_stats()
    by_emotion = _group_stats()

    for m in realized_sorted:
        sym = m.symbol
        tag = journal_by_trade_id.get(m.exit_trade_id) or {}
        strategy = (tag.get("strategy") or "—").strip()
        emotion = (tag.get("emotion") or "—").strip()

        for bucket, key in [(by_symbol, sym), (by_strategy, strategy), (by_emotion, emotion)]:
            bucket[key]["pnl"] += float(m.pnl)
            bucket[key]["matches"] += 1
            if m.pnl > 0:
                bucket[key]["wins"] += 1
            elif m.pnl < 0:
                bucket[key]["losses"] += 1

    def _finalize(bucket: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for k, v in bucket.items():
            wins = int(v["wins"])
            losses = int(v["losses"])
            matches = int(v["matches"])
            out.append(
                {
                    "key": k,
                    "pnl": float(v["pnl"]),
                    "matches": matches,
                    "win_rate": float(wins / max(1, wins + losses)),
                }
            )
        return sorted(out, key=lambda x: abs(x["pnl"]), reverse=True)

    return {
        "series": {
            "daily_realized_pnl": daily_series,
            "weekly_realized_pnl": weekly_series,
            "equity_curve": equity_series,
        },
        "stats": {
            "best_day": best_day,
            "worst_day": worst_day,
            "max_win_streak": int(max_win_streak),
            "max_loss_streak": int(max_loss_streak),
        },
        "breakdowns": {
            "by_symbol": _finalize(by_symbol),
            "by_strategy": _finalize(by_strategy),
            "by_emotion": _finalize(by_emotion),
        },
        "notes": {
            "attribution": "realized_match_pnl_attributed_to_exit_trade_id",
            "no_investment_advice": True,
        },
    }


