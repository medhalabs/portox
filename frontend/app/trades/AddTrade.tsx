"use client";

import { useState } from "react";

import { apiPost } from "@/lib/api";

export function AddTrade({ onCreated }: { onCreated: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [fees, setFees] = useState(0);
  const [tradeTime, setTradeTime] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/trades", {
        symbol,
        side,
        quantity,
        price,
        fees,
        trade_time: new Date(tradeTime).toISOString()
      });
      setSymbol("");
      setPrice(0);
      setFees(0);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="text-sm font-semibold">Add trade</div>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-slate-300">Symbol</div>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="RELIANCE"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300">Side</div>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-medium text-slate-300">Quantity</div>
            <input
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              type="number"
              min={1}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300">Price</div>
            <input
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              type="number"
              min={0}
              step="0.01"
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="text-xs font-medium text-slate-300">Fees</div>
            <input
              value={fees}
              onChange={(e) => setFees(Number(e.target.value))}
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="block">
          <div className="text-xs font-medium text-slate-300">Trade time</div>
          <input
            value={tradeTime}
            onChange={(e) => setTradeTime(e.target.value)}
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
        >
          {loading ? "Saving..." : "Add trade"}
        </button>
      </form>
    </div>
  );
}


