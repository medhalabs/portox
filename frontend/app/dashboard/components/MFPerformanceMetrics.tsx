"use client";

import type { AnalyticsOverview } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/utils/formatters";

export function MFPerformanceMetrics({ analytics }: { analytics: AnalyticsOverview }) {
  // Calculate from open positions (most reliable source)
  // For mutual funds, avg_price is the average NAV including fees
  // So qty * avg_price gives us total investment
  const mfPositions = (analytics.open_positions || []).filter(pos => 
    pos.type === "mutual_fund" || !pos.side
  );
  
  const totalInvestment = mfPositions.reduce((sum, pos) => {
    const qty = pos.quantity || pos.qty || 0;
    const avgPrice = pos.avg_cost || pos.avg_price || 0;
    return sum + (qty * avgPrice);
  }, 0);
  
  const currentValue = mfPositions.reduce((sum, pos) => {
    const qty = pos.quantity || pos.qty || 0;
    const currentPrice = pos.mark_price || pos.current_price || 0;
    return sum + (qty * currentPrice);
  }, 0);
  
  // Fallback to notes if calculation gives 0 but notes have values
  const notesInvestment = (analytics.notes as any)?.total_investment;
  const notesCurrentValue = (analytics.notes as any)?.current_value;
  
  const finalInvestment = (totalInvestment > 0) ? totalInvestment : (notesInvestment || 0);
  const finalCurrentValue = (currentValue > 0) ? currentValue : (notesCurrentValue || 0);
  
  const totalReturn = analytics.unrealized_pnl || 0;
  const returnPercent = finalInvestment > 0 ? (totalReturn / finalInvestment) * 100 : 0;
  const totalSchemes = (analytics.notes as any)?.total_schemes || mfPositions.length;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">Investment Metrics</div>
      <div className="mt-4 grid gap-2 text-sm">
        <Row label="Total Investment" value={formatCurrency(finalInvestment)} />
        <Row label="Current Value" value={formatCurrency(finalCurrentValue)} />
        <div className="my-2 border-t border-slate-800" />
        <Row 
          label="Total Return" 
          value={formatCurrency(totalReturn)} 
          valueClass={totalReturn >= 0 ? "text-emerald-200" : "text-rose-200"}
        />
        <Row 
          label="Return %" 
          value={formatPercent(returnPercent / 100)} 
          valueClass={returnPercent >= 0 ? "text-emerald-200" : "text-rose-200"}
        />
        <div className="my-2 border-t border-slate-800" />
        <Row label="Total Schemes" value={`${totalSchemes}`} />
        <Row label="Open Positions" value={`${analytics.open_positions?.length || 0}`} />
      </div>
      <div className="mt-3 text-xs text-slate-400">
        Returns based on current NAV from MFapi.in
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-300">{label}</div>
      <div className={`font-medium ${valueClass || "text-slate-100"}`}>{value}</div>
    </div>
  );
}

