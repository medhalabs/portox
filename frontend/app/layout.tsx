import "./globals.css";

import Link from "next/link";
import type { Metadata } from "next";

import { TopNav } from "./components/TopNav";

export const metadata: Metadata = {
  title: "portik",
  description: "Portfolio & Trade Journal + Portfolio Analytics"
};

const DISCLAIMER =
  "This platform does not provide investment advice. Analytics are for educational purposes only.";
const VENDOR = "Medhā Labs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-slate-100">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_0%,rgba(255,191,31,0.12),transparent_60%),radial-gradient(900px_500px_at_90%_10%,rgba(56,189,248,0.06),transparent_55%),radial-gradient(900px_500px_at_50%_100%,rgba(34,197,94,0.05),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-slate-950/60" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-8">
          <header className="sticky top-0 z-40 -mx-4 mb-8 border-b border-slate-800/70 bg-black/55 px-4 py-4 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
              <Link href="/" className="group flex items-center gap-2 text-lg font-semibold tracking-tight">
                <span className="inline-flex h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_18px_rgba(255,191,31,0.45)]" />
                <span className="text-slate-100 group-hover:text-white">portik</span>
              </Link>
              <TopNav />
            </div>
          </header>

          <main className="py-8">{children}</main>

          <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs text-slate-400">
            <p className="leading-relaxed">{DISCLAIMER}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-slate-400">
                Product developed by <span className="text-slate-200">{VENDOR}</span>.
              </p>
              <p className="text-slate-500">© {year} {VENDOR}. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}


