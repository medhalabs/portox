import "./globals.css";

import Link from "next/link";
import type { Metadata } from "next";

import { TopNav } from "./components/TopNav";

export const metadata: Metadata = {
  title: "portox",
  description: "Portfolio & Trade Journal + Portfolio Analytics"
};

const DISCLAIMER =
  "This platform does not provide investment advice. Analytics are for educational purposes only.";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              portox
            </Link>
            <TopNav />
          </header>

          <main className="py-8">{children}</main>

          <footer className="border-t border-slate-800 pt-6 text-xs text-slate-400">
            <p>{DISCLAIMER}</p>
          </footer>
        </div>
      </body>
    </html>
  );
}


