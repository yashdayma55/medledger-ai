"use client";

import { useState } from "react";
import Link from "next/link";
import { verifyEmailOtp } from "./actions";

export function VerifyEmailForm({
  email,
  errorFromUrl,
  success,
  role = "patient",
}: {
  email: string;
  errorFromUrl?: string | null;
  success?: boolean;
  role?: "patient" | "provider";
}) {
  const [isPending, setIsPending] = useState(false);

  if (success) {
    const loginHref = role === "provider" ? "/auth/login/doctor" : "/auth/login/patient";
    const loginLabel = role === "provider" ? "Go to doctor login" : "Go to patient login";
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4">
        <p className="text-teal-400 font-medium">Email verified successfully.</p>
        <p className="text-slate-400 text-sm">You can now sign in and view your dashboard.</p>
        <Link href={loginHref} className="inline-block text-teal-400 hover:text-teal-300 underline">
          {loginLabel}
        </Link>
        <br />
        <Link href="/" className="inline-block text-slate-400 hover:text-slate-300 underline text-sm">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        action={verifyEmailOtp}
        onSubmit={() => setIsPending(true)}
        className="space-y-5"
      >
        <input type="hidden" name="email" value={email} readOnly />
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-slate-300 mb-1">
            Verification code
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="000000"
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-4 text-center text-2xl tracking-[0.5em] text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <p className="mt-2 text-slate-500 text-sm">
            We sent a 6-digit code to <strong className="text-slate-400">{email}</strong>
          </p>
        </div>

        {errorFromUrl && (
          <p className="text-red-400 text-sm" role="alert">
            {errorFromUrl}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-teal-500 py-3 font-semibold text-white shadow-lg transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-medledger-slate disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/" className="text-teal-400 hover:text-teal-300 underline text-sm">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
