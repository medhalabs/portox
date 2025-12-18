"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearToken, getToken } from "@/lib/auth";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link href={href} className={active ? "text-white" : "hover:text-white"}>
      {children}
    </Link>
  );
}

export function TopNav() {
  const router = useRouter();
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

  function logout() {
    clearToken();
    setAuthed(false);
    router.push("/login");
  }

  return (
    <nav className="flex items-center gap-3 text-sm text-slate-300">
      <NavLink href="/dashboard">Dashboard</NavLink>
      <NavLink href="/insights">Insights</NavLink>
      <NavLink href="/trades">Trades</NavLink>
      <NavLink href="/journal">Journal</NavLink>

      <span className="mx-1 h-4 w-px bg-slate-800" />

      {!mounted ? null : authed ? (
        <button onClick={logout} className="hover:text-white">
          Logout
        </button>
      ) : (
        <>
          <NavLink href="/login">Login</NavLink>
          <NavLink href="/register">Register</NavLink>
        </>
      )}
    </nav>
  );
}


