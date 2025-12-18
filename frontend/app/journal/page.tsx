"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { JournalEntry } from "@/types/journal";
import type { Trade } from "@/types/trade";
import { formatDateTime } from "@/utils/formatters";

import { TradeJournalForm } from "./TradeJournalForm";
import { JournalEntryList } from "./components/JournalEntryList";

export default function JournalPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategyFilter, setStrategyFilter] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [e, t] = await Promise.all([apiFetch<JournalEntry[]>("/journal"), apiFetch<Trade[]>("/trades")]);
      setEntries(e);
      setTrades(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Journal</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <TradeJournalForm trades={trades} onCreated={reload} />

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Filters</div>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Strategy contains</div>
                <input
                  value={strategyFilter}
                  onChange={(e) => setStrategyFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Breakout"
                />
              </label>
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Emotion contains</div>
                <input
                  value={emotionFilter}
                  onChange={(e) => setEmotionFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="FOMO"
                />
              </label>
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Trade symbol contains</div>
                <input
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="RELIANCE"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setStrategyFilter("");
                  setEmotionFilter("");
                  setSymbolFilter("");
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm hover:bg-slate-900"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Entries</div>
            {loading ? <div className="mt-3 text-sm text-slate-300">Loading...</div> : null}
            <JournalEntryList
              entries={entries}
              trades={trades}
              onChanged={reload}
              filters={{
                strategyContains: strategyFilter,
                emotionContains: emotionFilter,
                symbolContains: symbolFilter
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


