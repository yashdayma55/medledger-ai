"use client";

import { useState } from "react";
import Link from "next/link";
import { registerPatient } from "./actions";

export function PatientRegisterForm({ errorFromUrl }: { errorFromUrl?: string | null }) {
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        action={registerPatient}
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
          <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-1">
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label htmlFor="dob" className="block text-sm font-medium text-slate-300 mb-1">
            Date of birth <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="dob"
            name="dob"
            type="date"
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div>
          <label htmlFor="sex_at_birth" className="block text-sm font-medium text-slate-300 mb-1">
            Sex at birth <span className="text-slate-500">(optional)</span>
          </label>
          <select
            id="sex_at_birth"
            name="sex_at_birth"
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="preferred_language" className="block text-sm font-medium text-slate-300 mb-1">
            Preferred language <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="preferred_language"
            name="preferred_language"
            type="text"
            className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="e.g. English"
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
        After signing up, we’ll send a 6-digit code to your email to verify your address.
      </p>

      <p className="mt-4 text-center">
        <Link
          href="/"
          className="text-teal-400 hover:text-teal-300 underline text-sm"
        >
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
