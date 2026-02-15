"use client";

import { useState } from "react";
import { loginAdmin } from "./actions";

export function AdminLoginForm({ errorFromUrl }: { errorFromUrl?: string | null }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <form
      action={loginAdmin}
      onSubmit={() => setIsPending(true)}
      className="space-y-5 w-full max-w-md mx-auto"
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="••••••••"
        />
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
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
