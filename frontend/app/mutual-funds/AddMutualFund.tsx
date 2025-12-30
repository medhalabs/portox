"use client";

import { useEffect, useState, useRef } from "react";

import { apiFetch, apiPost } from "@/lib/api";
import type { MutualFundScheme } from "@/types/mutual_fund";

export function AddMutualFund({ onCreated }: { onCreated: () => void }) {
  const [schemeCode, setSchemeCode] = useState("");
  const [schemeName, setSchemeName] = useState("");
  const [units, setUnits] = useState(0);
  const [nav, setNav] = useState(0);
  const [fees, setFees] = useState(0);
  const [investmentDate, setInvestmentDate] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MutualFundScheme[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [fetchingNav, setFetchingNav] = useState(false);
  const [currentNav, setCurrentNav] = useState<number | null>(null);
  const [isOldInvestment, setIsOldInvestment] = useState(false);
  const [entryMode, setEntryMode] = useState<"manual" | "search">("search");
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowSearch(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  async function performSearch() {
    setSearching(true);
    try {
      const result = await apiFetch<{ schemes: MutualFundScheme[] }>(
        `/mutual-funds/search?query=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(result.schemes || []);
      setShowSearch(true);
    } catch (err) {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function fetchLatestNav(schemeCode: string) {
    setFetchingNav(true);
    try {
      const result = await apiFetch<{ nav: number }>(`/mutual-funds/nav/${schemeCode}`);
      setCurrentNav(result.nav);
      // If investment date is today or future, auto-fill NAV
      const today = new Date().toISOString().split("T")[0];
      if (investmentDate >= today) {
        setNav(result.nav);
      }
    } catch (err) {
      setCurrentNav(null);
      console.error("Failed to fetch NAV:", err);
    } finally {
      setFetchingNav(false);
    }
  }

  async function fetchHistoricalNav(schemeCode: string, date: string) {
    setFetchingNav(true);
    try {
      const result = await apiFetch<{ nav: number }>(
        `/mutual-funds/nav/${schemeCode}/historical?date=${date}`
      );
      setNav(result.nav);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch historical NAV. Please enter manually.");
      console.error("Failed to fetch historical NAV:", err);
    } finally {
      setFetchingNav(false);
    }
  }

  function selectScheme(scheme: MutualFundScheme) {
    setSchemeCode(scheme.scheme_code);
    setSchemeName(scheme.scheme_name);
    setShowSearch(false);
    setSearchQuery(scheme.scheme_name);
    setSearchResults([]);
    setError(null);
    setNav(0); // Reset NAV when selecting new scheme
    // Fetch latest NAV to show current price
    fetchLatestNav(scheme.scheme_code);
  }

  // Check if investment date is in the past and fetch appropriate NAV
  useEffect(() => {
    if (!schemeCode || !investmentDate) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const invDate = new Date(investmentDate);
    invDate.setHours(0, 0, 0, 0);
    const isOld = invDate < today;
    setIsOldInvestment(isOld);
    
    // Only auto-fetch if NAV is not already set (to avoid overwriting user edits)
    // If it's an old investment, fetch historical NAV
    if (isOld && nav === 0) {
      fetchHistoricalNav(schemeCode, investmentDate);
    } else if (!isOld && currentNav !== null && nav === 0) {
      // If it's today or future, use current NAV
      setNav(currentNav);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investmentDate, schemeCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiPost("/mutual-funds", {
        scheme_code: schemeCode,
        scheme_name: schemeName,
        units,
        nav,
        fees,
        investment_date: new Date(investmentDate).toISOString()
      });
      setSchemeCode("");
      setSchemeName("");
      setUnits(0);
      setNav(0);
      setFees(0);
      setSearchQuery("");
      setShowSearch(false);
      setCurrentNav(null);
      setIsOldInvestment(false);
      setError(null);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mutual fund investment");
    } finally {
      setLoading(false);
    }
  }

  function handleModeChange(mode: "manual" | "search") {
    setEntryMode(mode);
    // Reset form when switching modes
    if (mode === "manual") {
      setSearchQuery("");
      setSchemeCode("");
      setSchemeName("");
      setNav(0);
      setCurrentNav(null);
      setShowSearch(false);
      setSearchResults([]);
    } else {
      setSchemeCode("");
      setSchemeName("");
      setNav(0);
      setCurrentNav(null);
    }
    setError(null);
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-4 sm:p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Add mutual fund</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("manual")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-manipulation ${
              entryMode === "manual"
                ? "bg-brand-400/20 text-brand-300 border border-brand-400/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            Manual entry
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("search")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors touch-manipulation ${
              entryMode === "search"
                ? "bg-brand-400/20 text-brand-300 border border-brand-400/30"
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            Search MF
          </button>
        </div>
      </div>
      <form onSubmit={onSubmit} className="mt-4 space-y-3 sm:space-y-3">
        {entryMode === "search" ? (
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Scheme</div>
            <div className="relative" ref={searchRef}>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length >= 2) {
                    setShowSearch(true);
                  } else {
                    setShowSearch(false);
                    // Clear selection if search is cleared
                    if (!e.target.value) {
                      setSchemeCode("");
                      setSchemeName("");
                      setNav(0);
                      setCurrentNav(null);
                    }
                  }
                }}
                onFocus={() => {
                  if (searchQuery.length >= 2 && searchResults.length > 0) {
                    setShowSearch(true);
                  }
                }}
                className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                placeholder="Type to search mutual fund..."
                inputMode="text"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  Searching...
                </div>
              )}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-800 bg-slate-950 shadow-lg">
                  {searchResults.map((scheme) => (
                    <button
                      key={scheme.scheme_code}
                      type="button"
                      onClick={() => selectScheme(scheme)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-900 border-b border-slate-800 last:border-b-0"
                    >
                      <div className="font-medium">{scheme.scheme_name}</div>
                      <div className="text-xs text-slate-400">Code: {scheme.scheme_code}</div>
                    </button>
                  ))}
                </div>
              )}
              {showSearch && !searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 shadow-lg p-4 text-sm text-slate-400">
                  No schemes found
                </div>
              )}
            </div>
            {schemeName && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-slate-300">
                  Selected: <span className="font-medium">{schemeName}</span> ({schemeCode})
                </div>
                {currentNav !== null && (
                  <div className="text-xs text-slate-400">
                    Current NAV: <span className="font-medium text-slate-300">₹{currentNav.toFixed(4)}</span>
                  </div>
                )}
              </div>
            )}
          </label>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1.5">Scheme Code</div>
              <input
                value={schemeCode}
                onChange={(e) => setSchemeCode(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                placeholder="Enter scheme code"
                inputMode="text"
                required
              />
            </label>
            <label className="block">
              <div className="text-xs font-medium text-slate-300 mb-1.5">Scheme Name</div>
              <input
                value={schemeName}
                onChange={(e) => setSchemeName(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                placeholder="Enter scheme name"
                inputMode="text"
                required
              />
            </label>
          </div>
        )}

        {((entryMode === "search" && schemeCode) || (entryMode === "manual" && schemeCode && schemeName)) && (
          <>
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3 mb-3">
              <div className="text-xs font-medium text-slate-300 mb-2">Investment Details</div>
              <div className="text-xs text-slate-400">
                All fields are editable. Please verify the data before submitting, especially for old investments where
                investment date and allotment date may differ.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300 mb-1.5">Investment Date</div>
                <input
                  value={investmentDate}
                  onChange={(e) => setInvestmentDate(e.target.value)}
                  type="date"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                />
                {isOldInvestment && (
                  <div className="mt-1 text-xs text-amber-400">
                    Old investment - fetching historical NAV...
                  </div>
                )}
              </label>

              <label className="block">
                <div className="text-xs font-medium text-slate-300 mb-1.5">NAV (at purchase) *</div>
                <div className="relative">
                  <input
                    value={nav || ""}
                    onChange={(e) => setNav(Number(e.target.value))}
                    type="number"
                    min={0}
                    step="0.0001"
                    required
                    className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                    inputMode="decimal"
                    placeholder="Enter NAV"
                  />
                  {fetchingNav && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      Fetching...
                    </div>
                  )}
                </div>
                <div className="mt-1 flex gap-2">
                  {isOldInvestment ? (
                    <button
                      type="button"
                      onClick={() => schemeCode && investmentDate && fetchHistoricalNav(schemeCode, investmentDate)}
                      disabled={fetchingNav}
                      className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50"
                    >
                      {fetchingNav ? "Fetching..." : "Fetch NAV for this date"}
                    </button>
                  ) : (
                    currentNav !== null && (
                      <button
                        type="button"
                        onClick={() => setNav(currentNav)}
                        className="text-xs text-brand-400 hover:text-brand-300"
                      >
                        Use current NAV (₹{currentNav.toFixed(4)})
                      </button>
                    )
                  )}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  * This is the NAV on the investment date (may differ from allotment NAV)
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs font-medium text-slate-300 mb-1.5">Units</div>
                <input
                  value={units || ""}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  type="number"
                  min={0}
                  step="0.0001"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                  inputMode="decimal"
                  placeholder="Enter units"
                />
              </label>

              <label className="block">
                <div className="text-xs font-medium text-slate-300 mb-1.5">Fees</div>
                <input
                  value={fees || ""}
                  onChange={(e) => setFees(Number(e.target.value))}
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm focus:border-brand-400/40 focus:outline-none touch-manipulation"
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </label>
            </div>

            {nav > 0 && units > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                <div className="text-xs font-medium text-slate-300 mb-1">Investment Summary</div>
                <div className="text-xs text-slate-400 space-y-0.5">
                  <div>Investment Amount: ₹{((nav * units) + fees).toFixed(2)}</div>
                  <div>NAV × Units: ₹{(nav * units).toFixed(2)}</div>
                  {fees > 0 && <div>Fees: ₹{fees.toFixed(2)}</div>}
                </div>
              </div>
            )}
          </>
        )}

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

        <button
          disabled={loading || !schemeCode || (entryMode === "manual" && !schemeName)}
          type="submit"
          className="w-full rounded-xl bg-brand-400 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60 touch-manipulation min-h-[48px] sm:min-h-0"
        >
          {loading ? "Saving..." : "Add investment"}
        </button>
      </form>
    </div>
  );
}

