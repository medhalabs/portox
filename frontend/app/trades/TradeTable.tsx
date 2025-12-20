"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/api";
import type { Trade } from "@/types/trade";
import { formatDateTime } from "@/utils/formatters";
import { useMemo, useState } from "react";

export function TradeTable({ trades, onChanged }: { trades: Trade[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<Trade | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Delete this trade? This also deletes any linked journal entry.")) return;
    await apiDelete(`/trades/${id}`);
    onChanged();
  }

  async function onSaveEdit(next: Partial<Trade> & { id: string }) {
    await apiPut(`/trades/${next.id}`, {
      symbol: next.symbol,
      side: next.side,
      quantity: next.quantity,
      price: next.price,
      fees: next.fees,
      trade_time: next.trade_time
    });
    setEditing(null);
    onChanged();
  }

  async function onDuplicate(trade: Trade) {
    await apiPost("/trades", {
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      fees: trade.fees,
      trade_time: new Date().toISOString(), // Current time for duplicate
    });
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Trade history</div>
        <div className="text-xs text-slate-400">{trades.length} trades</div>
      </div>
      {trades.length === 0 ? (
        <div className="mt-4 py-3 text-slate-400 text-sm">No trades yet.</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="mt-4 space-y-3 md:hidden">
            {trades.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-base">{t.symbol}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(t.trade_time)}</div>
                  </div>
                  <span
                    className={
                      t.side === "BUY"
                        ? "rounded-full border border-emerald-900 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-200"
                        : "rounded-full border border-rose-900 bg-rose-950/40 px-3 py-1 text-xs font-medium text-rose-200"
                    }
                  >
                    {t.side}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Qty</div>
                    <div className="font-medium mt-0.5">{t.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Price</div>
                    <div className="font-medium mt-0.5">{t.price.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Fees</div>
                    <div className="font-medium mt-0.5">{t.fees.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onDuplicate(t)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm hover:bg-slate-900 touch-manipulation"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm hover:bg-slate-900 touch-manipulation"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm hover:bg-slate-900 touch-manipulation"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="mt-4 overflow-x-auto hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  <th className="py-2">Time</th>
                  <th className="py-2">Symbol</th>
                  <th className="py-2">Side</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Fees</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">{formatDateTime(t.trade_time)}</td>
                    <td className="py-2 font-medium">{t.symbol}</td>
                    <td className="py-2">
                      <span
                        className={
                          t.side === "BUY"
                            ? "rounded-full border border-emerald-900 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-200"
                            : "rounded-full border border-rose-900 bg-rose-950/40 px-2 py-0.5 text-xs text-rose-200"
                        }
                      >
                        {t.side}
                      </span>
                    </td>
                    <td className="py-2">{t.quantity}</td>
                    <td className="py-2">{t.price.toFixed(2)}</td>
                    <td className="py-2">{t.fees.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onDuplicate(t)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs hover:bg-slate-900 touch-manipulation"
                          title="Duplicate trade"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => setEditing(t)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs hover:bg-slate-900 touch-manipulation"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs hover:bg-slate-900 touch-manipulation"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing ? (
        <EditTradeModal
          trade={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => onSaveEdit(next)}
        />
      ) : null}
    </div>
  );
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function EditTradeModal({
  trade,
  onClose,
  onSave
}: {
  trade: Trade;
  onClose: () => void;
  onSave: (next: Partial<Trade> & { id: string }) => void;
}) {
  const [symbol, setSymbol] = useState(trade.symbol);
  const [side, setSide] = useState<"BUY" | "SELL">(trade.side);
  const [quantity, setQuantity] = useState(trade.quantity);
  const [price, setPrice] = useState(trade.price);
  const [fees, setFees] = useState(trade.fees);
  const [tradeTime, setTradeTime] = useState(toLocalInputValue(trade.trade_time));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        id: trade.id,
        symbol,
        side,
        quantity,
        price,
        fees,
        trade_time: new Date(tradeTime).toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update trade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Edit trade</div>
          <button onClick={onClose} className="text-xs text-slate-300 hover:text-white">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Symbol</div>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
            />
          </label>

          {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 sm:px-3 sm:py-2 text-base sm:text-sm hover:bg-slate-800 touch-manipulation min-h-[48px] sm:min-h-0"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-brand-400 px-4 py-3 sm:px-3 sm:py-2 text-base sm:text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60 touch-manipulation min-h-[48px] sm:min-h-0"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


