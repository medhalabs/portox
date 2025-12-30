"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { MutualFund } from "@/types/mutual_fund";

import { AddMutualFund } from "./AddMutualFund";
import { MutualFundTable } from "./MutualFundTable";

export default function MutualFundsPage() {
  const router = useRouter();
  const [mutualFunds, setMutualFunds] = useState<MutualFund[]>([]);
  const [schemeQuery, setSchemeQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) router.push("/login");
  }, [router]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const mf = await apiFetch<MutualFund[]>("/mutual-funds");
      setMutualFunds(mf);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mutual funds");
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
        <h1 className="text-2xl font-semibold">Mutual Funds</h1>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AddMutualFund onCreated={reload} />

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Review filters</div>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Scheme contains</div>
                <input
                  value={schemeQuery}
                  onChange={(e) => setSchemeQuery(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Search scheme name or code"
                />
              </label>
              <div className="mb-2">
                <div className="text-xs font-medium text-slate-300 mb-2">Date Range Presets</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today.getFullYear(), today.getMonth(), 1);
                      setFromDate(start.toISOString().split("T")[0]);
                      setToDate(today.toISOString().split("T")[0]);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs hover:bg-slate-900"
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const start = new Date(today.getFullYear(), 0, 1);
                      setFromDate(start.toISOString().split("T")[0]);
                      setToDate(today.toISOString().split("T")[0]);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs hover:bg-slate-900"
                  >
                    YTD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const last30 = new Date(today);
                      last30.setDate(last30.getDate() - 30);
                      setFromDate(last30.toISOString().split("T")[0]);
                      setToDate(today.toISOString().split("T")[0]);
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs hover:bg-slate-900"
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs hover:bg-slate-900"
                  >
                    All Time
                  </button>
                </div>
              </div>
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
                  setSchemeQuery("");
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
        </div>

        <div className="lg:col-span-2">
          {loading ? <div className="text-sm text-slate-300">Loading...</div> : null}
          <MutualFundTable
            mutualFunds={mutualFunds.filter((mf) => {
              const schemeOk = schemeQuery
                ? mf.scheme_name.toLowerCase().includes(schemeQuery.toLowerCase()) ||
                  mf.scheme_code.toLowerCase().includes(schemeQuery.toLowerCase())
                : true;
              const d = new Date(mf.investment_date);
              const fromOk = fromDate ? d >= new Date(`${fromDate}T00:00:00`) : true;
              const toOk = toDate ? d <= new Date(`${toDate}T23:59:59`) : true;
              return schemeOk && fromOk && toOk;
            })}
            onChanged={reload}
          />
        </div>
      </div>
    </div>
  );
}

