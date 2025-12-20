"use client";

import type { AnalyticsOverview } from "@/types/portfolio";
import { formatCurrency } from "@/utils/formatters";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PnLChart({ analytics }: { analytics: AnalyticsOverview }) {
  const data = WEEKDAYS.map((name, idx) => {
    const v = analytics.time_buckets?.pnl_by_weekday?.[String(idx)] ?? 0;
    return { name, pnl: v };
  });

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-4 sm:p-5 shadow-card">
      <div className="text-sm font-semibold">Weekly P&amp;L (realized)</div>
      <div className="mt-4 h-44 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" fontSize={11} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0", fontSize: "12px" }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Bar dataKey="pnl" fill="#ffbf1f" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-slate-400">Bucketed by exit time of matched lots.</div>
    </div>
  );
}


