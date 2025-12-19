"use client";

import { useMemo, useState } from "react";

import { apiPost, apiPostFormData } from "@/lib/api";
import type { Trade } from "@/types/trade";

export function TradeJournalForm({ trades, onCreated }: { trades: Trade[]; onCreated: () => void }) {
  const tradeOptions = useMemo(() => trades.slice().sort((a, b) => (a.trade_time < b.trade_time ? 1 : -1)), [trades]);

  const [tradeId, setTradeId] = useState("");
  const [strategy, setStrategy] = useState("");
  const [emotion, setEmotion] = useState("");
  const [notes, setNotes] = useState("");
  const [entryRationale, setEntryRationale] = useState("");
  const [exitRationale, setExitRationale] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Rationale templates
  const entryTemplates = [
    { value: "", label: "Select template..." },
    { value: "Technical: Price broke above resistance. Volume confirmed the move.", label: "Technical Breakout" },
    { value: "Technical: Price broke below support. Volume confirmed the breakdown.", label: "Technical Breakdown" },
    { value: "Fundamental: Positive earnings report. Strong revenue growth expected.", label: "Positive Earnings" },
    { value: "Fundamental: Undervalued based on P/E ratio. Strong balance sheet.", label: "Value Play" },
    { value: "Momentum: Stock showing strong upward momentum with increasing volume.", label: "Momentum Play" },
    { value: "Reversal: Oversold conditions with RSI < 30. Expecting bounce.", label: "Oversold Reversal" },
    { value: "Reversal: Overbought conditions with RSI > 70. Expecting pullback.", label: "Overbought Reversal" },
    { value: "Breakout: Consolidation pattern complete. Price breaking key level.", label: "Consolidation Breakout" },
    { value: "News: Positive news catalyst. Market reaction favorable.", label: "News Catalyst" },
    { value: "Sector: Sector rotation favoring this industry.", label: "Sector Rotation" },
    { value: "Pattern: Chart pattern formation (head & shoulders, cup & handle, etc.).", label: "Chart Pattern" },
  ];
  
  const exitTemplates = [
    { value: "", label: "Select template..." },
    { value: "Target reached: Hit profit target. Taking profits.", label: "Profit Target Hit" },
    { value: "Stop loss: Hit stop loss. Limiting losses.", label: "Stop Loss Hit" },
    { value: "Technical exit: Price broke below key support. Exiting position.", label: "Support Break" },
    { value: "Technical exit: Price reached resistance. Booking profits.", label: "Resistance Hit" },
    { value: "Time-based: Holding period complete. Taking profits.", label: "Time-Based Exit" },
    { value: "Risk management: Reducing position size. Partial exit.", label: "Partial Exit" },
    { value: "Fundamental change: Earnings missed expectations. Exiting.", label: "Fundamental Change" },
    { value: "News: Negative news catalyst. Exiting to preserve capital.", label: "Negative News" },
    { value: "Trailing stop: Trailing stop triggered. Locking in gains.", label: "Trailing Stop" },
    { value: "Reversal signal: Technical indicators showing reversal. Exiting.", label: "Reversal Signal" },
  ];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const entry = await apiPost<{ id: string }>("/journal", {
        trade_id: tradeId,
        strategy: strategy || null,
        emotion: emotion || null,
        notes: notes || null,
        entry_rationale: entryRationale || null,
        exit_rationale: exitRationale || null,
      });

      // Upload files if any
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        try {
          for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append("file", file);
            await apiPostFormData(`/journal/attachments/${entry.id}`, formData);
          }
        } catch (fileErr) {
          console.error("Failed to upload some files:", fileErr);
          // Continue even if file upload fails
        } finally {
          setUploadingFiles(false);
        }
      }

      setStrategy("");
      setEmotion("");
      setNotes("");
      setEntryRationale("");
      setExitRationale("");
      setSelectedFiles([]);
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
          <div className="text-xs font-medium text-slate-300">Entry Rationale</div>
          <div className="mt-1 space-y-2">
            <select
              value={entryTemplates.find(t => t.value === entryRationale)?.value || ""}
              onChange={(e) => {
                const selected = entryTemplates.find(t => t.value === e.target.value);
                if (selected) {
                  setEntryRationale(selected.value);
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-brand-400/40 focus:outline-none"
            >
              {entryTemplates.map((tpl, idx) => (
                <option key={idx} value={tpl.value}>
                  {tpl.label}
                </option>
              ))}
            </select>
            <textarea
              value={entryRationale}
              onChange={(e) => setEntryRationale(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-200 focus:border-brand-400/40 focus:outline-none"
              placeholder="Why did you enter this trade? (Use template above or write your own)"
            />
          </div>
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-300">Exit Rationale</div>
          <div className="mt-1 space-y-2">
            <select
              value={exitTemplates.find(t => t.value === exitRationale)?.value || ""}
              onChange={(e) => {
                const selected = exitTemplates.find(t => t.value === e.target.value);
                if (selected) {
                  setExitRationale(selected.value);
                }
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-brand-400/40 focus:outline-none"
            >
              {exitTemplates.map((tpl, idx) => (
                <option key={idx} value={tpl.value}>
                  {tpl.label}
                </option>
              ))}
            </select>
            <textarea
              value={exitRationale}
              onChange={(e) => setExitRationale(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-200 focus:border-brand-400/40 focus:outline-none"
              placeholder="Why did you exit this trade? (Use template above or write your own)"
            />
          </div>
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

          <label className="block">
            <div className="text-xs font-medium text-slate-300">Attachments (optional)</div>
            <div className="mt-1 text-xs text-slate-400 mb-2">
              Upload images, audio files, or documents (max 10MB per file)
            </div>
            <input
              type="file"
              multiple
              accept="image/*,audio/*,.pdf,.txt"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSelectedFiles(files);
              }}
              className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-700"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-2 text-xs text-slate-400">
                {selectedFiles.length} file(s) selected
              </div>
            )}
          </label>

          {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

          <button
            disabled={loading || uploadingFiles}
            className="w-full rounded-xl bg-brand-400 px-4 py-2.5 text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60"
          >
            {uploadingFiles ? "Uploading files..." : loading ? "Saving..." : "Add entry"}
          </button>
      </form>
      <div className="mt-3 text-xs text-slate-400">
        Tagging is stored via <span className="font-mono">strategy</span> and <span className="font-mono">emotion</span>{" "}
        fields. More tag features can be added later without changing the frontend calculation rules.
      </div>
    </div>
  );
}


