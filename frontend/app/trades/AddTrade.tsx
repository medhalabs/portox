"use client";

import { useEffect, useState } from "react";

import { apiPost } from "@/lib/api";
import { applyTemplate, getTemplates, saveTemplate, type TradeTemplate } from "@/lib/trade_templates";

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
  const [templates, setTemplates] = useState<TradeTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

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
      setQuantity(1);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-4 sm:p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Add trade</div>
        <div className="text-xs text-slate-400 hidden sm:block">Manual entry</div>
      </div>
      <form onSubmit={onSubmit} className="mt-4 space-y-3 sm:space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-slate-300 mb-1.5">Symbol</div>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            required
            className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
            placeholder="RELIANCE"
            inputMode="text"
            autoCapitalize="characters"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Side</div>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "BUY" | "SELL")}
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Quantity</div>
            <input
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              type="number"
              min={1}
              required
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
              inputMode="numeric"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Price</div>
            <input
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              type="number"
              min={0}
              step="0.01"
              required
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
              inputMode="decimal"
            />
          </label>
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Fees</div>
            <input
              value={fees}
              onChange={(e) => setFees(Number(e.target.value))}
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
              inputMode="decimal"
            />
          </label>
        </div>

        <label className="block">
          <div className="text-xs font-medium text-slate-300 mb-1.5">Trade time</div>
          <input
            value={tradeTime}
            onChange={(e) => setTradeTime(e.target.value)}
            type="datetime-local"
            required
            className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          <button
            disabled={loading}
            type="submit"
            className="flex-1 rounded-xl bg-brand-400 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60 touch-manipulation min-h-[48px] sm:min-h-0"
          >
            {loading ? "Saving..." : "Add trade"}
          </button>
          <button
            type="button"
            onClick={() => setShowSaveTemplate(!showSaveTemplate)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm font-medium text-slate-100 hover:bg-slate-900 touch-manipulation min-h-[48px] sm:min-h-0"
          >
            Save Template
          </button>
        </div>

        {showSaveTemplate && (
          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950 p-3 sm:p-3">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="mb-2 w-full rounded-lg border border-slate-700 bg-black px-3 py-2.5 sm:px-2 sm:py-1 text-base sm:text-sm touch-manipulation"
            />
            <button
              type="button"
              onClick={() => {
                if (templateName && symbol) {
                  saveTemplate({
                    name: templateName,
                    symbol,
                    side,
                    quantity,
                    price: price || undefined,
                    fees: fees || undefined,
                  });
                  setTemplates(getTemplates());
                  setTemplateName("");
                  setShowSaveTemplate(false);
                }
              }}
              className="w-full rounded-lg bg-slate-800 px-3 py-3 sm:py-1.5 text-base sm:text-sm hover:bg-slate-700 touch-manipulation min-h-[44px] sm:min-h-0"
            >
              Save
            </button>
          </div>
        )}

        {templates.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 text-xs font-medium text-slate-400">Templates:</div>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const applied = applyTemplate(t);
                    setSymbol(applied.symbol);
                    setSide(applied.side);
                    setQuantity(applied.quantity);
                    setPrice(applied.price);
                    setFees(applied.fees);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs hover:bg-slate-900 touch-manipulation min-h-[40px] sm:min-h-0"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}


