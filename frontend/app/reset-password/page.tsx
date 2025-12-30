"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { apiPost } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError("Reset token is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      await apiPost("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 sm:p-7 shadow-card">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-900/40 border border-emerald-800 mb-4">
            <svg className="w-6 h-6 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2">Password Reset Successful</h1>
          <p className="text-sm text-slate-300 mb-4">
            Your password has been reset successfully. Redirecting to login...
          </p>
          <Link href="/login" className="text-sm text-brand-200 hover:text-brand-100">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 sm:p-7 shadow-card">
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-400/10 px-3 py-1 text-xs text-brand-100">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
        Reset Password
      </div>
      <h1 className="mt-4 text-xl sm:text-2xl font-semibold tracking-tight">Reset Password</h1>
      <p className="mt-1 text-sm text-slate-300">
        Enter your new password below.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        {!token && (
          <label className="block">
            <div className="text-xs font-medium text-slate-300 mb-1.5">Reset Token</div>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="text"
              required
              className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none touch-manipulation"
              placeholder="Enter reset token"
            />
          </label>
        )}

        <label className="block">
          <div className="text-xs font-medium text-slate-300 mb-1.5">New Password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
            className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none touch-manipulation"
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>

        <label className="block">
          <div className="text-xs font-medium text-slate-300 mb-1.5">Confirm Password</div>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            required
            minLength={8}
            className="w-full rounded-xl border border-slate-800 bg-black/30 px-4 py-3 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-400/40 focus:outline-none touch-manipulation"
            autoComplete="new-password"
            placeholder="Confirm your password"
          />
        </label>

        {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs">{error}</div> : null}

        <button
          disabled={loading || !token}
          className="w-full rounded-xl bg-brand-400 px-4 py-3.5 sm:py-2.5 text-base sm:text-sm font-semibold text-black shadow-glow hover:bg-brand-300 disabled:opacity-60 touch-manipulation min-h-[48px] sm:min-h-0"
        >
          {loading ? "Resetting..." : "Reset Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-md rounded-2xl sm:rounded-3xl border border-slate-800/70 bg-slate-950/35 p-5 sm:p-7 shadow-card">
        <div className="text-center py-8">
          <div className="text-sm text-slate-300">Loading...</div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

