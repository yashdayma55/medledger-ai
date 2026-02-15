"use client";

import { useState } from "react";
import { createFirstAdmin } from "./actions";

export function CreateFirstAdminForm({ errorFromUrl }: { errorFromUrl?: string | null }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <form
      action={createFirstAdmin}
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
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-slate-300 mb-1">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Super Admin"
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
        {isPending ? "Creating…" : "Create super admin"}
      </button>
    </form>
  );
}
