"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiPost } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResetToken(null);
    setLoading(true);
    try {
      const response = await apiPost<{ message: string; token?: string; reset_url?: string }>("/auth/forgot-password", { email });
      setSuccess(response.message);
      
      // In development, show the token if provided
      if (response.token) {
        setResetToken(response.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 sm:p-7 shadow-card">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-3 py-1 text-xs text-brand-100">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Password Reset
      </div>
      <h1 className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight">Forgot Password</h1>
      <p className="mt-1 text-sm text-slate-300">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <label className="block">
          <div className="text-xs font-medium text-slate-300 mb-1.5">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none touch-manipulation"
            inputMode="email"
            autoComplete="email"
            placeholder="your@email.com"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}
        {success ? <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-2 text-xs">{success}</div> : null}
        
        {resetToken && (
          <div className="rounded-lg border border-blue-900 bg-blue-950/40 p-3 text-xs space-y-2">
            <div className="font-medium text-blue-200">Development Mode: Reset Token</div>
            <div className="text-slate-300 break-all">{resetToken}</div>
            <Link
              href={`/reset-password?token=${resetToken}`}
              className="inline-block mt-2 text-blue-200 hover:text-blue-100 underline"
            >
              Click here to reset your password
            </Link>
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-xl bg-brand-400 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60 touch-manipulation min-h-[48px] sm:min-h-0"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-brand-200 hover:text-brand-100">
          Back to login
        </Link>
      </div>
    </div>
  );
}

