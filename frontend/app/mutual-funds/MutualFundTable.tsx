"use client";

import { apiDelete, apiPost, apiPut } from "@/lib/api";
import type { MutualFund } from "@/types/mutual_fund";
import { formatDateTime } from "@/utils/formatters";
import { useState } from "react";

export function MutualFundTable({ mutualFunds, onChanged }: { mutualFunds: MutualFund[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<MutualFund | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Delete this mutual fund investment?")) return;
    await apiDelete(`/mutual-funds/${id}`);
    onChanged();
  }

  async function onSaveEdit(next: Partial<MutualFund> & { id: string }) {
    await apiPut(`/mutual-funds/${next.id}`, {
      scheme_code: next.scheme_code,
      scheme_name: next.scheme_name,
      units: next.units,
      nav: next.nav,
      fees: next.fees,
      investment_date: next.investment_date
    });
    setEditing(null);
    onChanged();
  }

  async function onDuplicate(mf: MutualFund) {
    await apiPost("/mutual-funds", {
      scheme_code: mf.scheme_code,
      scheme_name: mf.scheme_name,
      units: mf.units,
      nav: mf.nav,
      fees: mf.fees,
      investment_date: new Date().toISOString(), // Current time for duplicate
    });
    onChanged();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Investment history</div>
        <div className="text-xs text-slate-400">{mutualFunds.length} investments</div>
      </div>
      {mutualFunds.length === 0 ? (
        <div className="mt-4 py-3 text-slate-400 text-sm">No mutual fund investments yet.</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="mt-4 space-y-3 md:hidden">
            {mutualFunds.map((mf) => (
              <div key={mf.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium text-base">{mf.scheme_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{formatDateTime(mf.investment_date)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Code: {mf.scheme_code}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Units</div>
                    <div className="font-medium mt-0.5">{mf.units.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">NAV</div>
                    <div className="font-medium mt-0.5">{mf.nav.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Investment</div>
                    <div className="font-medium mt-0.5">₹{((mf.nav * mf.units) + mf.fees).toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Fees</div>
                    <div className="font-medium mt-0.5">₹{mf.fees.toFixed(2)}</div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => onDuplicate(mf)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm hover:bg-slate-900 touch-manipulation"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => setEditing(mf)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm hover:bg-slate-900 touch-manipulation"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(mf.id)}
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
                  <th className="py-2">Date</th>
                  <th className="py-2">Scheme</th>
                  <th className="py-2">Code</th>
                  <th className="py-2">Units</th>
                  <th className="py-2">NAV</th>
                  <th className="py-2">Investment</th>
                  <th className="py-2">Fees</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {mutualFunds.map((mf) => (
                  <tr key={mf.id} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">{formatDateTime(mf.investment_date)}</td>
                    <td className="py-2 font-medium">{mf.scheme_name}</td>
                    <td className="py-2 text-slate-400 text-xs">{mf.scheme_code}</td>
                    <td className="py-2">{mf.units.toFixed(4)}</td>
                    <td className="py-2">₹{mf.nav.toFixed(4)}</td>
                    <td className="py-2">₹{((mf.nav * mf.units) + mf.fees).toFixed(2)}</td>
                    <td className="py-2">₹{mf.fees.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onDuplicate(mf)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs hover:bg-slate-900 touch-manipulation"
                          title="Duplicate investment"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => setEditing(mf)}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs hover:bg-slate-900 touch-manipulation"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(mf.id)}
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
        <EditMutualFundModal
          mf={editing}
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
  return d.toISOString().split("T")[0];
}

function EditMutualFundModal({
  mf,
  onClose,
  onSave
}: {
  mf: MutualFund;
  onClose: () => void;
  onSave: (next: Partial<MutualFund> & { id: string }) => void;
}) {
  const [schemeCode, setSchemeCode] = useState(mf.scheme_code);
  const [schemeName, setSchemeName] = useState(mf.scheme_name);
  const [units, setUnits] = useState(mf.units);
  const [nav, setNav] = useState(mf.nav);
  const [fees, setFees] = useState(mf.fees);
  const [investmentDate, setInvestmentDate] = useState(toLocalInputValue(mf.investment_date));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        id: mf.id,
        scheme_code: schemeCode,
        scheme_name: schemeName,
        units,
        nav,
        fees,
        investment_date: new Date(investmentDate).toISOString()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update investment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Edit investment</div>
          <button onClick={onClose} className="text-xs text-slate-300 hover:text-white">
            Close
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Scheme Name</div>
            <input
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
            />
          </label>

          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Scheme Code</div>
            <input
              value={schemeCode}
              onChange={(e) => setSchemeCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1.5">Units</div>
              <input
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1.5">NAV</div>
              <input
                value={nav}
                onChange={(e) => setNav(Number(e.target.value))}
                type="number"
                min={0}
                step="0.01"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
                inputMode="decimal"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1.5">Investment Date</div>
              <input
                value={investmentDate}
                onChange={(e) => setInvestmentDate(e.target.value)}
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base sm:text-sm touch-manipulation"
              />
            </label>
          </div>

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

