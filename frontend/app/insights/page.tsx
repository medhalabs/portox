"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { PerformanceResponse } from "@/types/analytics";
import { formatCurrency, formatPercent } from "@/utils/formatters";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart
} from "recharts";

export default function InsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const d = await apiFetch<PerformanceResponse>("/analytics/performance");
        if (!cancelled) setData(d);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load insights");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dailyChart = useMemo(() => {
    const pts = data?.series.daily_realized_pnl || [];
    return pts.map((p) => ({ ...p, short: p.date.slice(5) }));
  }, [data]);

  const equityChart = useMemo(() => {
    const pts = data?.series.equity_curve || [];
    return pts.map((p) => ({ ...p, short: p.date.slice(5) }));
  }, [data]);

  const weeklyChart = useMemo(() => data?.series.weekly_realized_pnl || [], [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Insights</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}
      {loading ? <div className="text-sm text-slate-300">Loading...</div> : null}

      {data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Best day">
            <div className="text-sm text-slate-300">
              {data.stats.best_day ? (
                <>
                  <div className="text-xs text-slate-400">{data.stats.best_day.date}</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(data.stats.best_day.pnl)}</div>
                </>
              ) : (
                "—"
              )}
            </div>
          </Card>
          <Card title="Worst day">
            <div className="text-sm text-slate-300">
              {data.stats.worst_day ? (
                <>
                  <div className="text-xs text-slate-400">{data.stats.worst_day.date}</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(data.stats.worst_day.pnl)}</div>
                </>
              ) : (
                "—"
              )}
            </div>
          </Card>
          <Card title="Streaks (matches)">
            <div className="grid gap-2 text-sm">
              <Row label="Max win streak" value={`${data.stats.max_win_streak}`} />
              <Row label="Max loss streak" value={`${data.stats.max_loss_streak}`} />
            </div>
          </Card>

          <div className="lg:col-span-2">
            <ChartCard title="Daily realized P&L">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="short" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0" }}
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                  />
                  <Line type="monotone" dataKey="pnl" stroke="#ffbf1f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="lg:col-span-1">
            <ChartCard title="Weekly realized P&L">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0" }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="pnl" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="lg:col-span-3">
            <ChartCard title="Equity curve (realized)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="short" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0" }}
                    formatter={(value) => formatCurrency(Number(value))}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#ffbf1f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="lg:col-span-3">
            <div className="grid gap-4 lg:grid-cols-3">
              <BreakdownTable title="By symbol" rows={data.breakdowns.by_symbol} />
              <BreakdownTable title="By strategy" rows={data.breakdowns.by_strategy} />
              <BreakdownTable title="By emotion" rows={data.breakdowns.by_emotion} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 shadow-card">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="h-64 rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 shadow-card">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 h-48">{children}</div>
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

function BreakdownTable({
  title,
  rows
}: {
  title: string;
  rows: { key: string; pnl: number; matches: number; win_rate: number }[];
}) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 shadow-card">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-400">
            <tr>
              <th className="py-2">Key</th>
              <th className="py-2">P&amp;L</th>
              <th className="py-2">Matches</th>
              <th className="py-2">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((r) => (
              <tr key={r.key} className="border-t border-slate-800">
                <td className="py-2 font-medium">{r.key}</td>
                <td className="py-2">{formatCurrency(r.pnl)}</td>
                <td className="py-2">{r.matches}</td>
                <td className="py-2">{formatPercent(r.win_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-xs text-slate-400">Top 10 by absolute P&amp;L.</div>
    </div>
  );
}


