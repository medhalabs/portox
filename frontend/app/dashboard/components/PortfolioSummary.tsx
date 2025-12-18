"use client";

import type { PortfolioSummary } from "@/types/portfolio";
import { formatCurrency } from "@/utils/formatters";

export function PortfolioSummaryCard({ summary }: { summary: PortfolioSummary }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">Portfolio Summary</div>
      <div className="mt-4 grid gap-2 text-sm">
        <Row label="Realized P&L" value={formatCurrency(summary.realized_pnl)} />
        <Row label="Unrealized P&L" value={formatCurrency(summary.unrealized_pnl)} />
        <div className="my-2 border-t border-slate-800" />
        <Row label="Total (mark-to-last)" value={formatCurrency(summary.total_pnl)} />
      </div>
      <div className="mt-3 text-xs text-slate-400">
        Unrealized uses last trade price per symbol (no external market data).
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-300">{label}</div>
      <div className="font-medium text-slate-100">{value}</div>
    </div>
  );
}


