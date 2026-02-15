"use client";

import { useState } from "react";
import Link from "next/link";
import { registerProvider } from "./actions";

export function ProviderRegisterForm({ errorFromUrl }: { errorFromUrl?: string | null }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        action={registerProvider}
        onSubmit={() => setIsPending(true)}
        className="space-y-5"
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
            placeholder="you@example.com"
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
            placeholder="Dr. Jane Smith"
          />
        </div>

        <div>
          <label htmlFor="npi_number" className="block text-sm font-medium text-slate-300 mb-1">
            NPI number (10 digits)
          </label>
          <input
            id="npi_number"
            name="npi_number"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            required
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="1234567890"
          />
          <p className="mt-1 text-slate-500 text-xs">
            Stored for our records only. No external verification.
          </p>
        </div>

        <div>
          <label htmlFor="clinic_name" className="block text-sm font-medium text-slate-300 mb-1">
            Clinic / practice name <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="clinic_name"
            name="clinic_name"
            type="text"
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="City Medical Center"
          />
        </div>

        <div>
          <label htmlFor="specialty_primary" className="block text-sm font-medium text-slate-300 mb-1">
            Primary specialty <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="specialty_primary"
            name="specialty_primary"
            type="text"
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="e.g. Internal Medicine"
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
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-slate-400 text-sm">
        We’ll send a 6-digit code to your email to verify it. Your account will then need admin approval for full access.
      </p>

      <p className="mt-4 text-center">
        <Link href="/auth/doctor" className="text-teal-400 hover:text-teal-300 underline text-sm">
          ← Back to doctor portal
        </Link>
      </p>
    </div>
  );
}
