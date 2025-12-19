"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getSettings, setSettings } from "@/lib/settings";
import { formatCurrency } from "@/utils/formatters";

type TaxReport = {
  tax_year: number;
  short_term: {
    gains: any[];
    losses: any[];
    total_gains: number;
    total_losses: number;
    net: number;
    count: number;
  };
  long_term: {
    gains: any[];
    losses: any[];
    total_gains: number;
    total_losses: number;
    net: number;
    count: number;
  };
  summary: {
    total_realized_pnl: number;
    net_short_term: number;
    net_long_term: number;
    short_term_taxable_gain?: number;
    long_term_taxable_gain?: number;
    short_term_tax?: number;
    long_term_tax?: number;
    total_tax?: number;
  };
  tax_rates?: {
    short_term_rate: number;
    long_term_rate: number;
  };
  tax_loss_harvesting: Array<{
    type: string;
    available_loss: number;
    could_offset: string;
  }>;
  notes: any;
};

type TaxYearsSummary = {
  by_year: Record<number, { realized_pnl: number; count: number }>;
};

export default function TaxPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [taxReport, setTaxReport] = useState<TaxReport | null>(null);
  const [yearsSummary, setYearsSummary] = useState<TaxYearsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortTermTaxRate, setShortTermTaxRate] = useState(15);
  const [longTermTaxRate, setLongTermTaxRate] = useState(10);
  const [showTaxSettings, setShowTaxSettings] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push("/login");
    const settings = getSettings();
    setShortTermTaxRate(settings.shortTermTaxRate);
    setLongTermTaxRate(settings.longTermTaxRate);
  }, [router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [report, summary] = await Promise.all([
          apiPost<TaxReport>(`/analytics/tax/${selectedYear}`, {
            short_term_tax_rate: shortTermTaxRate,
            long_term_tax_rate: longTermTaxRate,
          }),
          apiFetch<TaxYearsSummary>("/analytics/tax/years"),
        ]);
        setTaxReport(report);
        setYearsSummary(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tax report");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedYear, shortTermTaxRate, longTermTaxRate]);

  function handleSaveTaxRates() {
    setSettings({
      shortTermTaxRate,
      longTermTaxRate,
    });
    setShowTaxSettings(false);
  }

  const availableYears = yearsSummary ? Object.keys(yearsSummary.by_year).map(Number).sort((a, b) => b - a) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tax Reporting</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTaxSettings(!showTaxSettings)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-900"
          >
            Tax Rates
          </button>
          <label className="text-sm text-slate-300">Tax Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
            {availableYears.length === 0 && <option value={selectedYear}>{selectedYear}</option>}
          </select>
        </div>
      </div>

      {showTaxSettings && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
          <div className="text-sm font-semibold mb-4">Tax Rate Settings (%)</div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1">Short-Term Capital Gains Tax Rate</div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={shortTermTaxRate}
                onChange={(e) => setShortTermTaxRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1">Long-Term Capital Gains Tax Rate</div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={longTermTaxRate}
                onChange={(e) => setLongTermTaxRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleSaveTaxRates}
              className="rounded-xl bg-brand-400 px-4 py-2 text-sm font-semibold text-black shadow-glow hover:bg-brand-300"
            >
              Save Tax Rates
            </button>
            <button
              type="button"
              onClick={() => setShowTaxSettings(false)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-300">Loading...</div>
      ) : taxReport ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Summary for {taxReport.tax_year}</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-slate-400">Total Realized P&L</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(taxReport.summary.total_realized_pnl)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Net Short-Term</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(taxReport.summary.net_short_term)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Net Long-Term</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(taxReport.summary.net_long_term)}</div>
              </div>
            </div>
            {taxReport.summary.total_tax !== undefined && (
              <>
                <div className="my-4 border-t border-slate-800" />
                <div className="text-xs font-medium text-slate-400 mb-2">Tax Calculation</div>
                <div className="grid gap-2 text-sm">
                  {taxReport.summary.short_term_taxable_gain !== undefined && taxReport.summary.short_term_taxable_gain > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">
                        Short-Term Tax ({taxReport.tax_rates?.short_term_rate || shortTermTaxRate}%):
                      </span>
                      <span className="font-medium">{formatCurrency(taxReport.summary.short_term_tax || 0)}</span>
                    </div>
                  )}
                  {taxReport.summary.long_term_taxable_gain !== undefined && taxReport.summary.long_term_taxable_gain > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-300">
                        Long-Term Tax ({taxReport.tax_rates?.long_term_rate || longTermTaxRate}%):
                      </span>
                      <span className="font-medium">{formatCurrency(taxReport.summary.long_term_tax || 0)}</span>
                    </div>
                  )}
                  <div className="my-2 border-t border-slate-800" />
                  <div className="flex justify-between">
                    <span className="text-slate-200 font-semibold">Total Tax Liability:</span>
                    <span className="font-semibold text-red-400">{formatCurrency(taxReport.summary.total_tax || 0)}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    After-tax P&L: {formatCurrency(taxReport.summary.total_realized_pnl - (taxReport.summary.total_tax || 0))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Short-Term */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Short-Term Capital Gains/Losses</div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Total Gains:</span>
                <span className="font-medium text-green-400">{formatCurrency(taxReport.short_term.total_gains)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Losses:</span>
                <span className="font-medium text-red-400">{formatCurrency(taxReport.short_term.total_losses)}</span>
              </div>
              <div className="my-2 border-t border-slate-800" />
              <div className="flex justify-between">
                <span className="text-slate-300">Net Short-Term:</span>
                <span className="font-medium">{formatCurrency(taxReport.short_term.net)}</span>
              </div>
              {taxReport.summary.short_term_taxable_gain !== undefined && taxReport.summary.short_term_taxable_gain > 0 && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Taxable Gain:</span>
                    <span className="text-slate-300">{formatCurrency(taxReport.summary.short_term_taxable_gain)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tax @ {taxReport.tax_rates?.short_term_rate || shortTermTaxRate}%:</span>
                    <span className="text-red-400 font-medium">{formatCurrency(taxReport.summary.short_term_tax || 0)}</span>
                  </div>
                </>
              )}
              <div className="text-xs text-slate-400 mt-2">Transactions: {taxReport.short_term.count}</div>
            </div>
          </div>

          {/* Long-Term */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Long-Term Capital Gains/Losses</div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Total Gains:</span>
                <span className="font-medium text-green-400">{formatCurrency(taxReport.long_term.total_gains)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Total Losses:</span>
                <span className="font-medium text-red-400">{formatCurrency(taxReport.long_term.total_losses)}</span>
              </div>
              <div className="my-2 border-t border-slate-800" />
              <div className="flex justify-between">
                <span className="text-slate-300">Net Long-Term:</span>
                <span className="font-medium">{formatCurrency(taxReport.long_term.net)}</span>
              </div>
              {taxReport.summary.long_term_taxable_gain !== undefined && taxReport.summary.long_term_taxable_gain > 0 && (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Taxable Gain:</span>
                    <span className="text-slate-300">{formatCurrency(taxReport.summary.long_term_taxable_gain)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tax @ {taxReport.tax_rates?.long_term_rate || longTermTaxRate}%:</span>
                    <span className="text-red-400 font-medium">{formatCurrency(taxReport.summary.long_term_tax || 0)}</span>
                  </div>
                </>
              )}
              <div className="text-xs text-slate-400 mt-2">Transactions: {taxReport.long_term.count}</div>
            </div>
          </div>

          {/* Tax Loss Harvesting */}
          {taxReport.tax_loss_harvesting && taxReport.tax_loss_harvesting.length > 0 && (
            <div className="rounded-2xl border border-brand-400/30 bg-brand-400/10 p-5">
              <div className="text-sm font-semibold text-brand-100">Tax Loss Harvesting Opportunities</div>
              <div className="mt-3 space-y-2 text-sm">
                {taxReport.tax_loss_harvesting.map((opp, idx) => (
                  <div key={idx} className="text-slate-300">
                    {opp.type === "short_term" ? "Short-term" : "Long-term"} losses of{" "}
                    {formatCurrency(opp.available_loss)} could offset {opp.could_offset.replace("_", " ")}.
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
            {taxReport.notes?.disclaimer || "This is for informational purposes only. Consult a tax professional for tax advice."}
          </div>
        </div>
      ) : null}
    </div>
  );
}

