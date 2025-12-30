"use client";

import type { AnalyticsOverview } from "@/types/portfolio";
import { formatCurrency } from "@/utils/formatters";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function MFInvestmentChart({ analytics }: { analytics: AnalyticsOverview }) {
  // Calculate total current value from open positions
  const totalValue = (analytics.open_positions || []).reduce((sum, pos) => {
    const qty = pos.quantity || pos.qty || 0;
    const price = pos.mark_price || pos.current_price || 0;
    return sum + (qty * price);
  }, 0);

  // Get investment metrics from notes
  const totalInvestment = (analytics.notes as any)?.total_investment || 0;
  const currentValue = (analytics.notes as any)?.current_value || totalValue;

  // Create a simple chart showing investment vs current value
  const data = [
    { label: "Investment", value: totalInvestment },
    { label: "Current", value: currentValue },
  ];

  // If we have by_scheme data, show top performers
  const byScheme = (analytics.notes as any)?.by_scheme || [];
  const topPerformers = byScheme.slice(0, 3);

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-4 sm:p-5 shadow-card">
      <div className="text-sm font-semibold">Top Performing Schemes</div>
      {topPerformers.length === 0 ? (
        <div className="mt-4 py-3 text-slate-400 text-sm">No investments yet.</div>
      ) : (
        <div className="mt-4 space-y-2">
          {topPerformers.map((scheme: any, idx: number) => (
            <div key={scheme.scheme_code || idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">{scheme.scheme_name}</div>
                <div className={`text-xs font-medium ${scheme.unrealized_pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {formatCurrency(scheme.unrealized_pnl)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-slate-400">Investment</div>
                  <div className="font-medium mt-0.5">{formatCurrency(scheme.total_investment)}</div>
                </div>
                <div>
                  <div className="text-slate-400">Return %</div>
                  <div className={`font-medium mt-0.5 ${scheme.return_percent >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                    {scheme.return_percent >= 0 ? "+" : ""}{scheme.return_percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 text-xs text-slate-400">
        Showing top 3 schemes by absolute return
      </div>
    </div>
  );
}

