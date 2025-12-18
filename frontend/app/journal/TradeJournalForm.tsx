"use client";

import { useMemo, useState } from "react";

import { apiPost } from "@/lib/api";
import type { Trade } from "@/types/trade";

export function TradeJournalForm({ trades, onCreated }: { trades: Trade[]; onCreated: () => void }) {
  const tradeOptions = useMemo(() => trades.slice().sort((a, b) => (a.trade_time < b.trade_time ? 1 : -1)), [trades]);

  const [tradeId, setTradeId] = useState("");
  const [strategy, setStrategy] = useState("");
  const [emotion, setEmotion] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/journal", {
        trade_id: tradeId,
        strategy: strategy || null,
        emotion: emotion || null,
        notes: notes || null
      });
      setStrategy("");
      setEmotion("");
      setNotes("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create journal entry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Add journal entry</div>
        <div className="text-xs text-slate-400">Tag + notes</div>
      </div>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-slate-300">Trade</div>
          <select
            value={tradeId}
            onChange={(e) => setTradeId(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm focus:border-brand-400/40 focus:outline-none"
          >
            <option value="" disabled>
              Select a trade
            </option>
            {tradeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol} {t.side} {t.quantity} @ {t.price}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-300">Strategy (tag)</div>
          <input
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm focus:border-brand-400/40 focus:outline-none"
            placeholder="Breakout"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-300">Emotion (tag)</div>
          <input
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm focus:border-brand-400/40 focus:outline-none"
            placeholder="Calm / FOMO / Frustrated..."
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-300">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm focus:border-brand-400/40 focus:outline-none"
            placeholder="What went well? What to improve next time?"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-brand-400 px-4 py-2.5 text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add entry"}
        </button>
      </form>
      <div className="mt-3 text-xs text-slate-400">
        Tagging is stored via <span className="font-mono">strategy</span> and <span className="font-mono">emotion</span>{" "}
        fields. More tag features can be added later without changing the frontend calculation rules.
      </div>
    </div>
  );
}


