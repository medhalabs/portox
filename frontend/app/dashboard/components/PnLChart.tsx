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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">Weekly P&amp;L (realized)</div>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${v}`} />
            <Tooltip
              contentStyle={{ background: "#0b1220", border: "1px solid #1f2937", color: "#e2e8f0" }}
              formatter={(value) => formatCurrency(Number(value))}
            />
            <Bar dataKey="pnl" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-xs text-slate-400">Bucketed by exit time of matched lots.</div>
    </div>
  );
}


