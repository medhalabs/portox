"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { exportTradesCSV, exportTradesExcel } from "@/lib/export";
import { getSettings } from "@/lib/settings";
import type { Trade } from "@/types/trade";

import { AddTrade } from "./AddTrade";
import { TradeTable } from "./TradeTable";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function TradesPage() {
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [symbolQuery, setSymbolQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [brokerSummary, setBrokerSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);

  // Broker import (BYO token in Phase 1)
  const [broker, setBroker] = useState<"zerodha" | "upstox" | "dhan">("zerodha");
  const [brokerApiKey, setBrokerApiKey] = useState("");
  const [brokerAccessToken, setBrokerAccessToken] = useState("");
  const [brokerClientId, setBrokerClientId] = useState("");
  const [brokerFrom, setBrokerFrom] = useState("");
  const [brokerTo, setBrokerTo] = useState("");
  const [marketType, setMarketType] = useState<"indian_stocks" | "other_countries" | "forex" | "crypto">("indian_stocks");

  useEffect(() => {
    if (!getToken()) router.push("/login");
    
    // Load settings
    const settings = getSettings();
    setMarketType(settings.marketType);
    
    // Listen for settings changes
    const handleSettingsChange = (e: CustomEvent) => {
      setMarketType(e.detail.marketType);
    };
    window.addEventListener("settingsChanged", handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener("settingsChanged", handleSettingsChange as EventListener);
    };
  }, [router]);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const t = await apiFetch<Trade[]>("/trades");
      setTrades(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function reloadConnections() {
    try {
      const c = await apiFetch<{ connections: any[] }>("/brokers/connections");
      setConnections(c.connections || []);
    } catch {
      // ignore (e.g. missing encryption key)
      setConnections([]);
    }
  }

  useEffect(() => {
    reloadConnections();
  }, []);

  async function onUploadCsv(file: File) {
    setError(null);
    setImportSummary(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE_URL}/trades/import/csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      if (!res.ok) throw new Error(await res.text());
      const summary = await res.json();
      setImportSummary(summary);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV import failed");
    }
  }

  async function onBrokerImport() {
    setError(null);
    setBrokerSummary(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const body: any = {
        access_token: brokerAccessToken,
        from_date: brokerFrom || null,
        to_date: brokerTo || null
      };
      if (broker === "zerodha") body.api_key = brokerApiKey;
      if (broker === "dhan") body.client_id = brokerClientId || null;

      const res = await fetch(`${API_BASE_URL}/brokers/${broker}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      const summary = await res.json();
      setBrokerSummary(summary);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broker import failed");
    }
  }

  async function onSaveBrokerConnection() {
    setError(null);
    setBrokerSummary(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const body: any = { access_token: brokerAccessToken };
      if (broker === "zerodha") body.api_key = brokerApiKey;
      if (broker === "dhan") body.client_id = brokerClientId || null;

      const res = await fetch(`${API_BASE_URL}/brokers/${broker}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(await res.text());
      await reloadConnections();
      setBrokerSummary({ saved: true, broker });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save connection failed");
    }
  }

  async function onSyncBroker() {
    setError(null);
    setBrokerSummary(null);
    try {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/brokers/${broker}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const summary = await res.json();
      setBrokerSummary(summary);
      await reload();
      await reloadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broker sync failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Trades</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportTradesCSV().catch((err) => setError(err.message))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-900"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportTradesExcel().catch((err) => setError(err.message))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-900"
          >
            Export Excel
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm">{error}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AddTrade onCreated={reload} />

          {marketType === "indian_stocks" && (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Broker import (read-only)</div>
            <div className="mt-1 text-xs text-slate-400">
              Connect once (encrypted at rest) and sync without re-pasting tokens. No order placement.
            </div>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Broker</div>
                <select
                  value={broker}
                  onChange={(e) => setBroker(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="zerodha">Zerodha</option>
                  <option value="upstox">Upstox</option>
                  <option value="dhan">Dhan</option>
                </select>
              </label>

              {broker === "zerodha" ? (
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">Zerodha API key</div>
                  <input
                    value={brokerApiKey}
                    onChange={(e) => setBrokerApiKey(e.target.value.trim())}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="api_key"
                  />
                </label>
              ) : null}

              {broker === "dhan" ? (
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">Dhan client id (optional)</div>
                  <input
                    value={brokerClientId}
                    onChange={(e) => setBrokerClientId(e.target.value.trim())}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="client_id"
                  />
                </label>
              ) : null}

              <label className="block">
                <div className="text-xs font-medium text-slate-300">Access token</div>
                <input
                  value={brokerAccessToken}
                  onChange={(e) => setBrokerAccessToken(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="paste broker access token"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">From (optional)</div>
                  <input
                    value={brokerFrom}
                    onChange={(e) => setBrokerFrom(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <div className="text-xs font-medium text-slate-300">To (optional)</div>
                  <input
                    value={brokerTo}
                    onChange={(e) => setBrokerTo(e.target.value)}
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={onSaveBrokerConnection}
                className="rounded-xl bg-brand-400 px-4 py-2.5 text-sm font-semibold text-black shadow-glow hover:bg-brand-300"
              >
                Save connection
              </button>

              <button
                type="button"
                onClick={onSyncBroker}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900"
              >
                Sync from saved connection
              </button>

              <div className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300">
                <div className="font-medium text-slate-200">Connected brokers</div>
                <div className="mt-1">
                  {connections.length === 0 ? (
                    <span className="text-slate-400">None</span>
                  ) : (
                    connections.map((c) => (
                      <div key={c.id}>
                        {c.broker} • updated: {String(c.updated_at)}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {brokerSummary ? (
                <pre className="max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200">
                  {JSON.stringify(brokerSummary, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">Review filters</div>
            <div className="mt-4 grid gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Symbol contains</div>
                <input
                  value={symbolQuery}
                  onChange={(e) => setSymbolQuery(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="RELIANCE"
                />
              </label>
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Side</div>
                <select
                  value={sideFilter}
                  onChange={(e) => setSideFilter(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
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
                  setSymbolQuery("");
                  setSideFilter("ALL");
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

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
            <div className="text-sm font-semibold">CSV Import</div>
            <div className="mt-1 text-xs text-slate-400">Supports Zerodha/Upstox formats (best-effort).</div>
            <input
              type="file"
              accept=".csv"
              className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-700"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadCsv(f);
              }}
            />
            {importSummary ? (
              <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200">
                {JSON.stringify(importSummary, null, 2)}
              </pre>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-2">
          {loading ? <div className="text-sm text-slate-300">Loading...</div> : null}
          <TradeTable
            trades={trades.filter((t) => {
              const symOk = symbolQuery ? t.symbol.toUpperCase().includes(symbolQuery.toUpperCase()) : true;
              const sideOk = sideFilter === "ALL" ? true : t.side === sideFilter;
              const d = new Date(t.trade_time);
              const fromOk = fromDate ? d >= new Date(`${fromDate}T00:00:00`) : true;
              const toOk = toDate ? d <= new Date(`${toDate}T23:59:59`) : true;
              return symOk && sideOk && fromOk && toOk;
            })}
            onChanged={reload}
          />
        </div>
      </div>
    </div>
  );
}


