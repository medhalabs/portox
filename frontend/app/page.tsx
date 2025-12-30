import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/40 p-8 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(750px_300px_at_20%_0%,rgba(255,191,31,0.22),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_260px_at_95%_15%,rgba(56,189,248,0.10),transparent_60%)]" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-3 py-1 text-xs text-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            Built for execution review — no signals, no advice
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Turn trades into{" "}
            <span className="bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 bg-clip-text text-transparent">
              repeatable performance
            </span>
            .
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
            portik is a comprehensive portfolio tracker for traders and investors: track stock trades, manage mutual fund investments, 
            capture context, and measure performance with clean, server‑side analytics.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-green-400/25 bg-green-400/10 px-3 py-1 text-xs text-green-100">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Free until January 2027
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="rounded-xl bg-brand-400 px-5 py-2.5 text-sm font-semibold text-black shadow-glow hover:bg-brand-300"
            >
              Start journaling
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-brand-400/25 hover:bg-slate-900/40"
            >
              Continue
            </Link>
            <div className="text-xs text-slate-400">
              Analytics only. No predictions. No buy/sell signals.
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            <MiniStat label="Server-side analytics" value="No client-side P&L math" />
            <MiniStat label="Import options" value="CSV + broker sync (read-only)" />
            <MiniStat label="Multi-asset support" value="Stocks + Mutual Funds" />
            <MiniStat label="Designed for speed" value="Fast review, clean UI" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <FeatureCard
          title="Trade capture that doesn't fight you"
          desc="Add trades in seconds, edit mistakes, filter by symbol/side/date, and import in bulk."
          bullets={["Trade CRUD + editing", "CSV import with duplicate detection", "Broker sync (read-only)"]}
        />
        <FeatureCard
          title="Mutual fund tracking with live NAV"
          desc="Track your mutual fund investments with automatic NAV updates from MFapi.in. Search schemes, fetch historical NAVs, and monitor performance."
          bullets={["Search & select schemes", "Automatic NAV updates", "Historical NAV lookup", "Investment performance tracking"]}
        />
        <FeatureCard
          title="A journal that connects context to execution"
          desc="Keep strategy/emotion/notes tied to the trade so review is always grounded in why you took it."
          bullets={["Edit/delete entries", "Filter by strategy/emotion/symbol", "Trade-linked entry display"]}
        />
        <FeatureCard
          title="Performance insights you can act on"
          desc="Understand outcomes across time, strategies, and symbols—without turning the product into signals."
          bullets={["Daily & weekly realized P&L", "Equity curve + streaks", "Breakdowns by symbol/strategy/emotion", "Mutual fund performance metrics"]}
        />
        <FeatureCard
          title="Unified portfolio dashboard"
          desc="View all your investments in one place. Switch between trades and mutual funds with dedicated analytics for each asset type."
          bullets={["Combined portfolio view", "Separate analytics for trades & MFs", "Real-time NAV updates", "Top performing schemes"]}
        />
        <FeatureCard
          title="Unrealized P&L: transparent mark logic"
          desc="No market-data guesses. Default marks use last trade price; optionally provide your own marks for accuracy."
          bullets={["Mark-to-last trade (default)", "Optional mark overrides via API", "No market predictions"]}
        />
      </section>

      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/30 p-7 shadow-card">
        <div className="text-sm font-semibold">How it works</div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Step n="01" title="Import or add trades" desc="Bring in executions via CSV or broker sync. Edit anything." />
          <Step n="02" title="Track mutual funds" desc="Search schemes, add investments, and get automatic NAV updates." />
          <Step n="03" title="Journal the context" desc="Tag strategy/emotion and write notes while it's fresh." />
          <Step n="04" title="Review the outcomes" desc="Track realized/unrealized P&L and performance breakdowns." />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ValueCard
          title="No advice, no signals"
          desc="We don't predict markets. This is performance analytics and journaling."
        />
        <ValueCard
          title="Secure by design"
          desc="JWT auth. Broker tokens can be stored encrypted at rest (when enabled)."
        />
        <ValueCard
          title="Built to extend"
          desc="Modular FastAPI backend and clean UI. Postgres and more brokers can be added later."
        />
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-blue-800/50 bg-gradient-to-br from-blue-950/40 to-slate-950/40 p-8 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_250px_at_50%_50%,rgba(56,189,248,0.15),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Coming Soon
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 bg-clip-text text-transparent">
              Stock Analyzer
            </span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            Advanced stock analysis tools with technical indicators, screening capabilities, and comprehensive market insights. 
            Analyze stocks, compare performance, and make informed investment decisions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-3 py-1 text-xs text-blue-200">Technical Indicators</span>
            <span className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-3 py-1 text-xs text-blue-200">Stock Screening</span>
            <span className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-3 py-1 text-xs text-blue-200">Performance Comparison</span>
            <span className="rounded-lg border border-blue-800/50 bg-blue-950/30 px-3 py-1 text-xs text-blue-200">Market Insights</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-black/25 p-4">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function FeatureCard({ title, desc, bullets }: { title: string; desc: string; bullets: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/30 p-7 shadow-card">
      <div className="text-lg font-semibold tracking-tight">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-300">{desc}</div>
      <ul className="mt-4 space-y-2 text-sm text-slate-200">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-black/25 p-5">
      <div className="text-xs font-semibold text-brand-200">{n}</div>
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-300">{desc}</div>
    </div>
  );
}

function ValueCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-950/30 p-6 shadow-card">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-slate-300">{desc}</div>
    </div>
  );
}


