"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Trade } from "@/types/trade";

import { AddTrade } from "./AddTrade";
import { TradeTable } from "./TradeTable";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [symbolQuery, setSymbolQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const t = await apiFetch<Trade[]>("/trades");
      setTrades(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onUploadCsv(file: File) {
    setError(null);
    setImportSummary(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL}/trades/import/csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) throw new Error(await res.text());
      const summary = await res.json();
      setImportSummary(summary);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Trades</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AddTrade onCreated={reload} />

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Review filters</div>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Symbol contains</div>
                <input
                  value={symbolQuery}
                  onChange={(e) => setSymbolQuery(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="RELIANCE"
                />
              </label>
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Side</div>
                <select
                  value={sideFilter}
                  onChange={(e) => setSideFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">From</div>
                  <input
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">To</div>
                  <input
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSymbolQuery("");
                  setSideFilter("ALL");
                  setFromDate("");
                  setToDate("");
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm hover:bg-slate-900"
              >
                Clear filters
              </button>
              <div className="text-xs text-slate-400">
                Filtering is UI-only. All calculations and analytics remain server-side.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">CSV Import</div>
            <div className="mt-1 text-xs text-slate-400">Supports Zerodha/Upstox formats (best-effort).</div>
            <input
              type="file"
              accept=".csv"
              className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-700"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadCsv(f);
              }}
            />
            {importSummary ? (
              <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200">
                {JSON.stringify(importSummary, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? <div className="text-sm text-slate-300">Loading...</div> : null}
          <TradeTable
            trades={trades.filter((t) => {
              const symOk = symbolQuery ? t.symbol.toUpperCase().includes(symbolQuery.toUpperCase()) : true;
              const sideOk = sideFilter === "ALL" ? true : t.side === sideFilter;
              const d = new Date(t.trade_time);
              const fromOk = fromDate ? d >= new Date(`${fromDate}T00:00:00`) : true;
              const toOk = toDate ? d <= new Date(`${toDate}T23:59:59`) : true;
              return symOk && sideOk && fromOk && toOk;
            })}
            onChanged={reload}
          />
        </div>
      </div>
    </div>
  );
}


