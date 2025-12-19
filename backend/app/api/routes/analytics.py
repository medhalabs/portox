from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import get_current_user
from app.db.duckdb import fetch_all
from app.models.analytics import OverviewRequest
from app.services.analytics_service import overview_from_trades, performance_from_trades, realized_matches
from app.services.trade_analysis_service import (
    calculate_trade_heatmap,
    calculate_time_of_day_analysis,
    calculate_symbol_performance_matrix,
    calculate_strategy_comparison_matrix,
    calculate_win_loss_distribution,
)
from app.services.export_service import export_analytics_csv, export_realized_matches_csv
from app.services.pdf_service import generate_performance_report
from app.services.pnl_service import TradeRow, compute_fifo
from app.services.tax_service import calculate_tax_classification, get_tax_year_summary
from app.models.tax import TaxReportRequest

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _load_trades(user_id: str) -> list[TradeRow]:
    rows = fetch_all(
        """
        SELECT id, user_id, symbol, side, quantity, price, trade_time, fees
        FROM trades
        WHERE user_id = ?
        ORDER BY trade_time ASC
        """.strip(),
        [user_id],
    )
    return [TradeRow(**r) for r in rows]  # type: ignore[arg-type]


@router.get("/overview")
def overview(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    return overview_from_trades(trades)


@router.post("/overview")
def overview_with_marks(payload: OverviewRequest, user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    try:
        return overview_from_trades(trades, marks=payload.marks, strict=payload.strict)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/realized-matches")
def matches(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    return {"matches": realized_matches(trades)}


def _load_journal_tags(user_id: str) -> dict:
    # Latest journal entry per trade_id (schema doesn't enforce 1:1).
    rows = fetch_all(
        """
        SELECT je.trade_id, je.strategy, je.emotion, je.created_at
        FROM journal_entries je
        JOIN trades t ON t.id = je.trade_id
        WHERE t.user_id = ?
        ORDER BY je.created_at DESC
        """.strip(),
        [user_id],
    )
    out: dict = {}
    for r in rows:
        tid = str(r["trade_id"])
        if tid not in out:
            out[tid] = {"strategy": r.get("strategy"), "emotion": r.get("emotion")}
    return out


@router.get("/performance")
def performance(user: dict = Depends(get_current_user)) -> dict:
    trades = _load_trades(str(user["id"]))
    tags = _load_journal_tags(str(user["id"]))
    return performance_from_trades(trades, journal_by_trade_id=tags)


@router.get("/export/csv")
def export_overview_csv(user: dict = Depends(get_current_user)) -> StreamingResponse:
    """Export analytics overview to CSV"""
    trades = _load_trades(str(user["id"]))
    analytics = overview_from_trades(trades)
    csv_data = export_analytics_csv(analytics)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics_overview.csv"},
    )


@router.get("/realized-matches/export/csv")
def export_matches_csv(user: dict = Depends(get_current_user)) -> StreamingResponse:
    """Export realized matches to CSV"""
    trades = _load_trades(str(user["id"]))
    matches = realized_matches(trades)
    csv_data = export_realized_matches_csv(matches)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=realized_matches.csv"},
    )


@router.get("/export/pdf")
def export_pdf(user: dict = Depends(get_current_user)) -> StreamingResponse:
    """Export performance report as PDF"""
    from fastapi.responses import Response
    
    trades = _load_trades(str(user["id"]))
    analytics = overview_from_trades(trades)
    tags = _load_journal_tags(str(user["id"]))
    performance_data = performance_from_trades(trades, journal_by_trade_id=tags)
    
    pdf_data = generate_performance_report(
        analytics=analytics,
        performance=performance_data,
        period="All Time",
        user_email=user.get("email", ""),
    )
    
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=performance_report.pdf"},
    )


@router.get("/tax/years")
def tax_years_summary(user: dict = Depends(get_current_user)) -> dict:
    """Get summary of realized P&L by tax year"""
    trades = _load_trades(str(user["id"]))
    realized, _, _ = compute_fifo(trades)
    return {"by_year": get_tax_year_summary(realized)}


@router.get("/trade-heatmap")
def trade_heatmap(user: dict = Depends(get_current_user)) -> dict:
    """Get trade heatmap data (calendar view of P&L)"""
    trades = _load_trades(str(user["id"]))
    return calculate_trade_heatmap(trades)


@router.get("/time-of-day")
def time_of_day_analysis(user: dict = Depends(get_current_user)) -> dict:
    """Get time-of-day analysis (P&L by hour)"""
    trades = _load_trades(str(user["id"]))
    return calculate_time_of_day_analysis(trades)


@router.get("/symbol-matrix")
def symbol_performance_matrix(user: dict = Depends(get_current_user)) -> dict:
    """Get symbol performance matrix"""
    trades = _load_trades(str(user["id"]))
    return calculate_symbol_performance_matrix(trades)


@router.get("/strategy-matrix")
def strategy_comparison_matrix(user: dict = Depends(get_current_user)) -> dict:
    """Get strategy comparison matrix"""
    trades = _load_trades(str(user["id"]))
    tags = _load_journal_tags(str(user["id"]))
    return calculate_strategy_comparison_matrix(trades, journal_by_trade_id=tags)


@router.get("/win-loss-distribution")
def win_loss_distribution(user: dict = Depends(get_current_user)) -> dict:
    """Get win/loss distribution histogram data"""
    trades = _load_trades(str(user["id"]))
    return calculate_win_loss_distribution(trades)


@router.post("/tax/{tax_year}")
def tax_report(tax_year: int, payload: TaxReportRequest, user: dict = Depends(get_current_user)) -> dict:
    """Get tax report for a specific tax year with tax rates"""
    trades = _load_trades(str(user["id"]))
    realized, _, _ = compute_fifo(trades)
    short_term_rate = payload.short_term_tax_rate if payload.short_term_tax_rate is not None else 15.0
    long_term_rate = payload.long_term_tax_rate if payload.long_term_tax_rate is not None else 10.0
    return calculate_tax_classification(
        realized, tax_year=tax_year, short_term_tax_rate=short_term_rate, long_term_tax_rate=long_term_rate
    )


@router.get("/tax/{tax_year}")
def tax_report_get(tax_year: int, user: dict = Depends(get_current_user)) -> dict:
    """Get tax report for a specific tax year with default tax rates"""
    trades = _load_trades(str(user["id"]))
    realized, _, _ = compute_fifo(trades)
    return calculate_tax_classification(realized, tax_year=tax_year)


