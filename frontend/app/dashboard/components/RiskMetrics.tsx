"use client";

import type { AnalyticsOverview } from "@/types/portfolio";
import { formatCurrency, formatPercent } from "@/utils/formatters";

export function RiskMetrics({ analytics }: { analytics: AnalyticsOverview }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">Risk Metrics</div>
      <div className="mt-4 grid gap-2 text-sm">
        <Row label="Win rate" value={formatPercent(analytics.win_rate)} />
        <Row label="Avg win" value={formatCurrency(analytics.avg_win)} />
        <Row label="Avg loss" value={formatCurrency(analytics.avg_loss)} />
        <Row label="Max drawdown" value={formatCurrency(analytics.drawdown)} />
        <Row
          label="Risk-reward"
          value={analytics.risk_reward_ratio == null ? "—" : analytics.risk_reward_ratio.toFixed(2)}
        />
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


