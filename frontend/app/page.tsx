import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Portfolio + Trade Journal Analytics</h1>
        <p className="mt-2 max-w-2xl text-slate-300">
          Track trades, journal executions, and review performance analytics. No predictions and no buy/sell signals.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-900"
          >
            Login
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <div className="text-sm font-semibold">Trade tracking</div>
          <div className="mt-1 text-sm text-slate-300">CRUD + CSV import (Zerodha/Upstox best-effort).</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <div className="text-sm font-semibold">Journal</div>
          <div className="mt-1 text-sm text-slate-300">Strategy, emotion, and notes linked to trades.</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-5">
          <div className="text-sm font-semibold">Analytics</div>
          <div className="mt-1 text-sm text-slate-300">P&amp;L, win-rate, drawdown, risk metrics, time buckets.</div>
        </div>
      </div>
    </div>
  );
}


