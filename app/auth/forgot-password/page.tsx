import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type Props = { searchParams: Promise<{ error?: string; sent?: string }> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, sent } = await searchParams;
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;
  const showSuccess = sent === "1";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Forgot password?
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Enter your email and we’ll send you a link to reset your password.
        </p>
      </div>

      <div className="w-full max-w-md">
        {showSuccess ? (
          <div className="rounded-lg border border-slate-600 bg-medledger-slate-light p-6 text-center space-y-4">
            <p className="text-teal-400 font-medium">Check your email</p>
            <p className="text-slate-400 text-sm">
              If an account exists for that email, we’ve sent a password reset link. It expires in 1 hour.
            </p>
            <Link
              href="/auth/login/patient"
              className="inline-block text-teal-400 hover:text-teal-300 underline text-sm"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <ForgotPasswordForm errorFromUrl={errorFromUrl} />
        )}

        <p className="mt-6 text-center">
          <Link href="/auth/login/patient" className="text-slate-400 hover:text-slate-300 underline text-sm">
            ← Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
