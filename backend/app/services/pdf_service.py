from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT


def generate_performance_report(
    analytics: Dict[str, Any],
    performance: Dict[str, Any] | None = None,
    period: str = "All Time",
    user_email: str = "",
) -> bytes:
    """Generate a PDF performance report"""
    from io import BytesIO

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5 * inch, bottomMargin=0.5 * inch)
    story = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=24,
        textColor=colors.HexColor("#FFBF1F"),
        spaceAfter=30,
        alignment=TA_CENTER,
    )
    story.append(Paragraph("Portfolio Performance Report", title_style))
    story.append(Spacer(1, 0.2 * inch))

    # Header info
    normal_style = styles["Normal"]
    story.append(Paragraph(f"<b>Period:</b> {period}", normal_style))
    if user_email:
        story.append(Paragraph(f"<b>Account:</b> {user_email}", normal_style))
    story.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
    story.append(Spacer(1, 0.3 * inch))

    # Summary metrics
    story.append(Paragraph("<b>Portfolio Summary</b>", styles["Heading2"]))
    summary_data = [
        ["Metric", "Value"],
        ["Realized P&L", f"${analytics.get('realized_pnl', 0):,.2f}"],
        ["Unrealized P&L", f"${analytics.get('unrealized_pnl', 0):,.2f}"],
        ["Total P&L", f"${analytics.get('total_pnl', 0):,.2f}"],
    ]
    summary_table = Table(summary_data, colWidths=[3 * inch, 2 * inch])
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 12),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 0.3 * inch))

    # Risk metrics
    story.append(Paragraph("<b>Risk Metrics</b>", styles["Heading2"]))
    risk_data = [
        ["Metric", "Value"],
        ["Win Rate", f"{analytics.get('win_rate', 0) * 100:.2f}%"],
        ["Average Win", f"${analytics.get('avg_win', 0):,.2f}"],
        ["Average Loss", f"${analytics.get('avg_loss', 0):,.2f}"],
        ["Max Drawdown", f"${analytics.get('drawdown', 0):,.2f}"],
        ["Risk-Reward Ratio", f"{analytics.get('risk_reward_ratio', 'N/A')}"],
    ]

    adv = analytics.get("advanced_metrics", {})
    if adv:
        risk_data.extend(
            [
                ["Sharpe Ratio", f"{adv.get('sharpe_ratio', 'N/A')}"],
                ["Sortino Ratio", f"{adv.get('sortino_ratio', 'N/A')}"],
                ["Calmar Ratio", f"{adv.get('calmar_ratio', 'N/A')}"],
                ["Profit Factor", f"{adv.get('profit_factor', 'N/A')}"],
                ["Expectancy", f"${adv.get('expectancy', 'N/A')}"],
                ["Avg Holding Period", f"{adv.get('avg_holding_period_days', 'N/A')} days"],
            ]
        )

    risk_table = Table(risk_data, colWidths=[3 * inch, 2 * inch])
    risk_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 12),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]
        )
    )
    story.append(risk_table)
    story.append(Spacer(1, 0.3 * inch))

    # Open positions
    open_positions = analytics.get("open_positions", [])
    if open_positions:
        story.append(Paragraph("<b>Open Positions</b>", styles["Heading2"]))
        pos_data = [["Symbol", "Side", "Qty", "Avg Cost", "Mark Price", "Unrealized P&L"]]
        for pos in open_positions:
            pos_data.append(
                [
                    pos.get("symbol", ""),
                    pos.get("side", ""),
                    str(pos.get("quantity", 0)),
                    f"${pos.get('avg_cost', 0):,.2f}",
                    f"${pos.get('mark_price', 0):,.2f}",
                    f"${pos.get('unrealized_pnl', 0):,.2f}",
                ]
            )
        pos_table = Table(pos_data, colWidths=[1 * inch, 0.8 * inch, 0.8 * inch, 1 * inch, 1 * inch, 1.2 * inch])
        pos_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                ]
            )
        )
        story.append(pos_table)
        story.append(Spacer(1, 0.3 * inch))

    # Footer
    story.append(Spacer(1, 0.5 * inch))
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )
    story.append(
        Paragraph(
            "This platform does not provide investment advice. Analytics are for educational purposes only.",
            disclaimer_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer.read()

