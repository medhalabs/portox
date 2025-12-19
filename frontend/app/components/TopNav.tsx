"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearToken, getToken } from "@/lib/auth";
import { NotificationBell } from "./NotificationBell";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-lg border border-brand-400/30 bg-brand-400/10 px-3 py-1.5 text-brand-100 shadow-[0_0_0_1px_rgba(255,191,31,0.08)]"
          : "rounded-lg px-3 py-1.5 text-slate-300 hover:bg-slate-900/40 hover:text-white"
      }
    >
      {children}
    </Link>
  );
}

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(!!getToken());

    function onStorage() {
      setAuthed(!!getToken());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // `storage` doesn't fire in the same tab; update on navigation as well.
  useEffect(() => {
    if (!mounted) return;
    setAuthed(!!getToken());
  }, [pathname, mounted]);

  function logout() {
    clearToken();
    setAuthed(false);
    router.push("/login");
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      {!mounted ? null : authed ? (
        <>
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/insights">Insights</NavLink>
          <NavLink href="/analysis">Analysis</NavLink>
          <NavLink href="/trades">Trades</NavLink>
          <NavLink href="/journal">Journal</NavLink>
          <NavLink href="/tax">Tax</NavLink>
          <NavLink href="/settings">Settings</NavLink>

          <span className="mx-1 hidden h-4 w-px bg-slate-800 md:block" />

          <NotificationBell />

          <button
            onClick={logout}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-slate-200 hover:border-brand-400/30 hover:bg-slate-900/40 hover:text-white"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink href="/login">Login</NavLink>
          <NavLink href="/register">Register</NavLink>
        </>
      )}
    </nav>
  );
}


