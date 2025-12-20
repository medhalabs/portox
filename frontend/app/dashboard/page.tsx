"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { exportPerformancePDF } from "@/lib/export";
import type { AnalyticsOverview, PortfolioSummary } from "@/types/portfolio";

import { PortfolioSummaryCard } from "./components/PortfolioSummary";
import { PnLChart } from "./components/PnLChart";
import { OpenPositions } from "./components/OpenPositions";
import { RiskMetrics } from "./components/RiskMetrics";

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) router.push("/login");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [s, a] = await Promise.all([
          apiFetch<PortfolioSummary>("/portfolio/summary"),
          apiFetch<AnalyticsOverview>("/analytics/overview")
        ]);
        if (!cancelled) {
          setSummary(s);
          setAnalytics(a);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold">Dashboard</h1>
        <button
          type="button"
          onClick={() => exportPerformancePDF().catch((err) => setError(err instanceof Error ? err.message : "Export failed"))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 sm:py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-900 touch-manipulation min-h-[44px] sm:min-h-0"
        >
          Export PDF Report
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}

      {loading ? <div className="text-sm text-slate-300">Loading...</div> : null}

      {summary && analytics ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <PortfolioSummaryCard summary={summary} />
          <RiskMetrics analytics={analytics} />
          <PnLChart analytics={analytics} />
          <div className="lg:col-span-3">
            <OpenPositions positions={summary.open_positions} />
          </div>
        </div>
      ) : null}
    </div>
  );
}


