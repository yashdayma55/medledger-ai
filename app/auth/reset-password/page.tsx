import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  const tokenFromUrl = typeof token === "string" ? token.trim() : "";
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;

  if (!tokenFromUrl) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="font-display text-2xl font-bold text-white">
            Invalid reset link
          </h1>
          <p className="text-slate-400">
            This link is invalid or has expired. Please request a new password reset.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block text-teal-400 hover:text-teal-300 underline"
          >
            Request new link
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Set new password
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Enter your new password below.
        </p>
      </div>
      <ResetPasswordForm token={tokenFromUrl} errorFromUrl={errorFromUrl} />
      <p className="mt-6 text-center">
        <Link href="/auth/login/patient" className="text-slate-400 hover:text-slate-300 underline text-sm">
          ← Back to login
        </Link>
      </p>
    </main>
  );
}
