"use client";

import { useMemo, useState } from "react";

import { apiDelete, apiPut } from "@/lib/api";
import type { JournalEntry } from "@/types/journal";
import type { Trade } from "@/types/trade";
import { formatDateTime } from "@/utils/formatters";

export function JournalEntryList({
  entries,
  trades,
  onChanged,
  filters
}: {
  entries: JournalEntry[];
  trades: Trade[];
  onChanged: () => void;
  filters: { strategyContains: string; emotionContains: string; symbolContains: string };
}) {
  const tradeById = useMemo(() => new Map(trades.map((t) => [t.id, t])), [trades]);
  const [editing, setEditing] = useState<JournalEntry | null>(null);

  const filtered = useMemo(() => {
    const s = filters.strategyContains.trim().toLowerCase();
    const e = filters.emotionContains.trim().toLowerCase();
    const sym = filters.symbolContains.trim().toUpperCase();

    return entries.filter((x) => {
      const st = (x.strategy || "").toLowerCase();
      const em = (x.emotion || "").toLowerCase();
      const trade = tradeById.get(x.trade_id);
      const tsym = trade?.symbol?.toUpperCase() || "";

      const okS = s ? st.includes(s) : true;
      const okE = e ? em.includes(e) : true;
      const okSym = sym ? tsym.includes(sym) : true;
      return okS && okE && okSym;
    });
  }, [entries, filters, tradeById]);

  async function onDelete(entryId: string) {
    if (!confirm("Delete this journal entry?")) return;
    await apiDelete(`/journal/${entryId}`);
    onChanged();
  }

  async function onSave(next: { id: string; strategy: string | null; emotion: string | null; notes: string | null }) {
    await apiPut(`/journal/${next.id}`, { strategy: next.strategy, emotion: next.emotion, notes: next.notes });
    setEditing(null);
    onChanged();
  }

  return (
    <div className="mt-4 space-y-3">
      {filtered.length === 0 ? (
        <div className="text-sm text-slate-400">{entries.length === 0 ? "No journal entries yet." : "No matches."}</div>
      ) : (
        filtered.map((x) => {
          const t = tradeById.get(x.trade_id);
          return (
            <div key={x.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  {formatDateTime(x.created_at)} •{" "}
                  {t ? (
                    <span className="text-slate-300">
                      {t.symbol} {t.side} {t.quantity} @ {t.price}
                    </span>
                  ) : (
                    <span className="font-mono text-slate-300">{x.trade_id}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-2 text-xs">
                    {x.strategy ? (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-200">
                        {x.strategy}
                      </span>
                    ) : null}
                    {x.emotion ? (
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-slate-200">
                        {x.emotion}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => setEditing(x)}
                    className="rounded-lg border border-slate-800 bg-black/30 px-3 py-1.5 text-xs text-slate-200 hover:border-brand-400/25 hover:bg-slate-900/40 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(x.id)}
                    className="rounded-lg border border-slate-800 bg-black/30 px-3 py-1.5 text-xs text-slate-200 hover:border-rose-500/30 hover:bg-rose-950/30 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {x.notes ? <div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{x.notes}</div> : null}
            </div>
          );
        })
      )}

      {editing ? <EditJournalModal entry={editing} onClose={() => setEditing(null)} onSave={onSave} /> : null}
    </div>
  );
}

function EditJournalModal({
  entry,
  onClose,
  onSave
}: {
  entry: JournalEntry;
  onClose: () => void;
  onSave: (next: { id: string; strategy: string | null; emotion: string | null; notes: string | null }) => void;
}) {
  const [strategy, setStrategy] = useState(entry.strategy || "");
  const [emotion, setEmotion] = useState(entry.emotion || "");
  const [notes, setNotes] = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        id: entry.id,
        strategy: strategy.trim() ? strategy.trim() : null,
        emotion: emotion.trim() ? emotion.trim() : null,
        notes: notes.trim() ? notes : null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Edit journal entry</div>
          <button onClick={onClose} className="text-xs text-slate-300 hover:text-white">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300">Strategy</div>
            <input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="text-xs font-medium text-slate-300">Emotion</div>
            <input
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <div className="text-xs font-medium text-slate-300">Notes</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={7}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>

          {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-lg bg-brand-400 px-3 py-2 text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


