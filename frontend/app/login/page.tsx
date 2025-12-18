"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiPost } from "@/lib/api";
import { setToken } from "@/lib/auth";

type TokenResponse = { access_token: string; token_type: "bearer" };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await apiPost<TokenResponse>("/auth/login", { email, password });
      setToken(token.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-800/70 bg-slate-950/35 p-7 shadow-card">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-3 py-1 text-xs text-brand-100">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Secure sign-in
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Login</h1>
      <p className="mt-1 text-sm text-slate-300">
        New here?{" "}
        <Link href="/register" className="text-brand-200 hover:text-brand-100">
          Create an account
        </Link>
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-slate-300">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-300">Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="mt-1 w-full rounded-xl border border-slate-800 bg-black/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-brand-400 px-4 py-2.5 text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}


