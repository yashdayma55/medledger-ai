"use client";

import { useState } from "react";
import { resetPassword } from "./actions";

export function ResetPasswordForm({
  token,
  errorFromUrl,
}: {
  token: string;
  errorFromUrl?: string | null;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <form
      action={resetPassword}
      onSubmit={() => setIsPending(true)}
      className="space-y-5 w-full max-w-md"
    >
      <input type="hidden" name="token" value={token} readOnly />
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
          New password
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
        <label htmlFor="confirm_password" className="block text-sm font-medium text-slate-300 mb-1">
          Confirm new password
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="w-full rounded-lg border border-slate-600 bg-medledger-slate-light px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          placeholder="Same as above"
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
        {isPending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
