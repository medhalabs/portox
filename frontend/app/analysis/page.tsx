"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/utils/formatters";
import { ViewToggle } from "@/app/components/ViewToggle";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

type ViewType = "trades" | "mutual_funds";

type HeatmapData = {
  date: string;
  year: number;
  month: number;
  day: number;
  pnl: number;
};

type TimeOfDayData = {
  by_entry_hour: Array<{
    hour: number;
    total_pnl: number;
    avg_pnl: number;
    count: number;
    wins: number;
    losses: number;
  }>;
  by_exit_hour: Array<{
    hour: number;
    total_pnl: number;
    avg_pnl: number;
    count: number;
    wins: number;
    losses: number;
  }>;
};

type SymbolMatrix = {
  symbols: Array<{
    symbol: string;
    total_pnl: number;
    trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    avg_win: number;
    avg_loss: number;
    profit_factor: number | null;
  }>;
};

type StrategyMatrix = {
  strategies: Array<{
    strategy: string;
    total_pnl: number;
    trades: number;
    wins: number;
    losses: number;
    win_rate: number;
    avg_win: number;
    avg_loss: number;
    profit_factor: number | null;
  }>;
};

type WinLossDistribution = {
  distribution: Array<{
    bin: string;
    wins: number;
    losses: number;
    bin_index: number;
  }>;
  summary: {
    total_wins: number;
    total_losses: number;
    avg_win: number;
    avg_loss: number;
    max_win: number;
    max_loss: number;
  };
};

export default function AnalysisPage() {
  const router = useRouter();
  const [viewType, setViewType] = useState<ViewType>("trades");
  const [heatmap, setHeatmap] = useState<{ heatmap_data: HeatmapData[] } | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayData | null>(null);
  const [symbolMatrix, setSymbolMatrix] = useState<SymbolMatrix | null>(null);
  const [strategyMatrix, setStrategyMatrix] = useState<StrategyMatrix | null>(null);
  const [distribution, setDistribution] = useState<WinLossDistribution | null>(null);
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
        if (viewType === "trades") {
          const [h, t, s, st, d] = await Promise.all([
            apiFetch<{ heatmap_data: HeatmapData[] }>("/analytics/trade-heatmap"),
            apiFetch<TimeOfDayData>("/analytics/time-of-day"),
            apiFetch<SymbolMatrix>("/analytics/symbol-matrix"),
            apiFetch<StrategyMatrix>("/analytics/strategy-matrix"),
            apiFetch<WinLossDistribution>("/analytics/win-loss-distribution"),
          ]);
          if (!cancelled) {
            setHeatmap(h);
            setTimeOfDay(t);
            setSymbolMatrix(s);
            setStrategyMatrix(st);
            setDistribution(d);
          }
        } else {
          // For mutual funds, analysis is limited - clear trade-specific data
          setHeatmap(null);
          setTimeOfDay(null);
          setSymbolMatrix(null);
          setStrategyMatrix(null);
          setDistribution(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analysis");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [viewType]);

  // Generate calendar heatmap data
  const heatmapCalendar = heatmap?.heatmap_data || [];
  const maxPnl = Math.max(...heatmapCalendar.map((d) => Math.abs(d.pnl)), 1);

  // Helper to get color intensity
  function getHeatmapColor(pnl: number): string {
    if (pnl === 0) return "#1e293b"; // slate-800
    const intensity = Math.abs(pnl) / maxPnl;
    const base = pnl > 0 ? "#22c55e" : "#ef4444"; // green or red
    const opacity = Math.min(0.3 + intensity * 0.7, 1);
    return pnl > 0
      ? `rgba(34, 197, 94, ${opacity})`
      : `rgba(239, 68, 68, ${opacity})`;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{viewType === "trades" ? "Trade Analysis" : "Mutual Fund Analysis"}</h1>
        <ViewToggle value={viewType} onChange={setViewType} />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}
      {loading ? <div className="text-sm text-slate-300">Loading...</div> : null}

      {viewType === "mutual_funds" ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm text-slate-400">
            Mutual fund analysis is available in the Insights page. Trade-specific analysis (heatmaps, time-of-day, etc.) 
            is not applicable to mutual funds as they don't have entry/exit trades.
          </div>
        </div>
      ) : heatmap && timeOfDay && symbolMatrix && strategyMatrix && distribution && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Trade Heatmap */}
          <div className="lg:col-span-2">
            <ChartCard title="Trade Heatmap (Calendar View of P&L)">
              <div className="mt-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {heatmapCalendar.map((day) => (
                    <div
                      key={day.date}
                      className="aspect-square rounded border border-slate-800 p-1 text-center"
                      style={{ backgroundColor: getHeatmapColor(day.pnl) }}
                      title={`${day.date}: ${formatCurrency(day.pnl)}`}
                    >
                      <div className="text-[8px] text-slate-400">{day.day}</div>
                      <div className="text-[10px] font-semibold">{formatCurrency(day.pnl).slice(0, 6)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Time of Day Analysis */}
          <ChartCard title="P&L by Entry Hour">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeOfDay.by_entry_hour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="total_pnl">
                  {timeOfDay.by_entry_hour.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="P&L by Exit Hour">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeOfDay.by_exit_hour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="total_pnl">
                  {timeOfDay.by_exit_hour.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total_pnl >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Symbol Performance Matrix */}
          <div className="lg:col-span-2">
            <ChartCard title="Symbol Performance Matrix">
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr>
                      <th className="py-2">Symbol</th>
                      <th className="py-2">Total P&L</th>
                      <th className="py-2">Trades</th>
                      <th className="py-2">Wins</th>
                      <th className="py-2">Losses</th>
                      <th className="py-2">Win Rate</th>
                      <th className="py-2">Avg Win</th>
                      <th className="py-2">Avg Loss</th>
                      <th className="py-2">Profit Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolMatrix.symbols.map((sym) => (
                      <tr key={sym.symbol} className="border-t border-slate-800">
                        <td className="py-2 font-medium">{sym.symbol}</td>
                        <td className={`py-2 ${sym.total_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatCurrency(sym.total_pnl)}
                        </td>
                        <td className="py-2">{sym.trades}</td>
                        <td className="py-2 text-green-400">{sym.wins}</td>
                        <td className="py-2 text-red-400">{sym.losses}</td>
                        <td className="py-2">{formatPercent(sym.win_rate)}</td>
                        <td className="py-2 text-green-400">{formatCurrency(sym.avg_win)}</td>
                        <td className="py-2 text-red-400">{formatCurrency(sym.avg_loss)}</td>
                        <td className="py-2">{sym.profit_factor?.toFixed(2) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          {/* Strategy Comparison Matrix */}
          <div className="lg:col-span-2">
            <ChartCard title="Strategy Comparison Matrix">
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr>
                      <th className="py-2">Strategy</th>
                      <th className="py-2">Total P&L</th>
                      <th className="py-2">Trades</th>
                      <th className="py-2">Wins</th>
                      <th className="py-2">Losses</th>
                      <th className="py-2">Win Rate</th>
                      <th className="py-2">Avg Win</th>
                      <th className="py-2">Avg Loss</th>
                      <th className="py-2">Profit Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyMatrix.strategies.map((strat) => (
                      <tr key={strat.strategy} className="border-t border-slate-800">
                        <td className="py-2 font-medium">{strat.strategy}</td>
                        <td className={`py-2 ${strat.total_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatCurrency(strat.total_pnl)}
                        </td>
                        <td className="py-2">{strat.trades}</td>
                        <td className="py-2 text-green-400">{strat.wins}</td>
                        <td className="py-2 text-red-400">{strat.losses}</td>
                        <td className="py-2">{formatPercent(strat.win_rate)}</td>
                        <td className="py-2 text-green-400">{formatCurrency(strat.avg_win)}</td>
                        <td className="py-2 text-red-400">{formatCurrency(strat.avg_loss)}</td>
                        <td className="py-2">{strat.profit_factor?.toFixed(2) || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>

          {/* Win/Loss Distribution */}
          <div className="lg:col-span-2">
            <ChartCard title="Win/Loss Distribution">
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distribution.distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="bin" stroke="#94a3b8" fontSize={10} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "#06080f", border: "1px solid rgba(255,191,31,0.22)", color: "#e2e8f0" }}
                    />
                    <Bar dataKey="wins" stackId="a" fill="#22c55e" name="Wins" />
                    <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" />
                  </BarChart>
                </ResponsiveContainer>
                {distribution.summary ? (
                  <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
                    <div>
                      <div className="text-xs text-slate-400">Total Wins</div>
                      <div className="font-medium text-green-400">{distribution.summary.total_wins}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Total Losses</div>
                      <div className="font-medium text-red-400">{distribution.summary.total_losses}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Avg Win</div>
                      <div className="font-medium text-green-400">{formatCurrency(distribution.summary.avg_win)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Avg Loss</div>
                      <div className="font-medium text-red-400">{formatCurrency(distribution.summary.avg_loss)}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

