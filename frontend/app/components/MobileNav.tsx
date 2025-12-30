"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { clearToken } from "@/lib/auth";

function MobileNavLink({ href, children, onClose }: { href: string; children: React.ReactNode; onClose: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`block rounded-lg px-4 py-3.5 text-base font-medium transition-colors touch-manipulation ${
        active
          ? "bg-brand-400/10 text-brand-100 border border-brand-400/30"
          : "text-slate-200 hover:bg-slate-900/40 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

export function MobileNav({ onLogout }: { onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogout() {
    clearToken();
    setIsOpen(false);
    onLogout();
  }

  const menuContent = isOpen && mounted ? (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[9999] md:hidden"
        onClick={() => setIsOpen(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <nav 
        className="fixed inset-y-0 right-0 z-[10000] w-72 max-w-[85vw] bg-slate-950 border-l border-slate-800 p-6 overflow-y-auto md:hidden shadow-2xl"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 10000 }}
      >
        <div className="flex flex-col gap-3">
          <div className="mb-4 pb-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 touch-manipulation"
              aria-label="Close menu"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <MobileNavLink href="/dashboard" onClose={() => setIsOpen(false)}>Dashboard</MobileNavLink>
          <MobileNavLink href="/insights" onClose={() => setIsOpen(false)}>Insights</MobileNavLink>
          <MobileNavLink href="/analysis" onClose={() => setIsOpen(false)}>Analysis</MobileNavLink>
          <MobileNavLink href="/trades" onClose={() => setIsOpen(false)}>Trades</MobileNavLink>
          <MobileNavLink href="/mutual-funds" onClose={() => setIsOpen(false)}>Mutual Funds</MobileNavLink>
          <MobileNavLink href="/journal" onClose={() => setIsOpen(false)}>Journal</MobileNavLink>
          <MobileNavLink href="/tax" onClose={() => setIsOpen(false)}>Tax</MobileNavLink>
          <MobileNavLink href="/settings" onClose={() => setIsOpen(false)}>Settings</MobileNavLink>
          <div className="border-t border-slate-800 my-2" />
          <button
            onClick={handleLogout}
            className="block w-full text-left rounded-lg px-4 py-3 text-base font-medium text-slate-200 hover:bg-slate-900/40 hover:text-white transition-colors touch-manipulation"
          >
            Logout
          </button>
        </div>
      </nav>
    </>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2.5 rounded-lg text-slate-300 hover:bg-slate-900/40 hover:text-white focus:outline-none touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            <path d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {mounted && typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}

