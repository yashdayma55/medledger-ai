import Link from "next/link";
import { DoctorLoginForm } from "./DoctorLoginForm";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginDoctorPage({ searchParams }: Props) {
  const { error, message } = await searchParams;
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;
  const successMessage = typeof message === "string" ? decodeURIComponent(message) : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Login as doctor
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Sign in with the email and password you set when you registered. Use &quot;Forgot password?&quot; only if you don’t remember your password.
        </p>
      </div>

      <div className="w-full max-w-md">
        {successMessage && (
          <p className="mb-4 text-teal-400 text-sm text-center" role="status">
            {successMessage}
          </p>
        )}
        <DoctorLoginForm errorFromUrl={errorFromUrl} />
        <p className="mt-4 text-center text-slate-500 text-sm">
          Only if you don’t remember your password:{" "}
          <Link
            href="/auth/forgot-password"
            className="text-teal-400 hover:text-teal-300 underline"
          >
            Forgot password?
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/auth/doctor" className="text-slate-400 hover:text-slate-300 underline text-sm">
            ← Back to doctor portal
          </Link>
        </p>
      </div>
    </main>
  );
}
