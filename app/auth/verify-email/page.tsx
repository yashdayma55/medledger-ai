import { VerifyEmailForm } from "./VerifyEmailForm";

type Props = { searchParams: Promise<{ email?: string; error?: string; success?: string; role?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email: emailParam, error: errorParam, success: successParam, role: roleParam } = await searchParams;
  const email = typeof emailParam === "string" ? emailParam.trim() : "";
  const errorFromUrl = typeof errorParam === "string" ? decodeURIComponent(errorParam) : null;
  const success = successParam === "1";
  const role = roleParam === "provider" ? "provider" : "patient";

  if (!email && !success) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center space-y-6">
          <h1 className="font-display text-2xl font-bold text-white">
            Verify your email
          </h1>
          <p className="text-slate-400">
            This page is used after registration. Please{" "}
            <a href="/auth/register/patient" className="text-teal-400 hover:underline">
              register as a patient
            </a>{" "}
            first; we’ll then send you a 6-digit code and bring you here.
          </p>
          <p>
            <a href="/" className="text-teal-400 hover:text-teal-300 underline text-sm">
              ← Back to home
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          {success ? "Email verified" : "Check your email"}
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          {success
            ? "Your account is ready."
            : "Enter the 6-digit code we sent to your email address."}
        </p>
      </div>
      {email && (
        <VerifyEmailForm
          email={email}
          errorFromUrl={errorFromUrl}
          success={success}
          role={role}
        />
      )}
      {success && !email && (
        <p className="text-slate-400">
          <a href="/" className="text-teal-400 hover:underline">← Back to home</a>
        </p>
      )}
    </main>
  );
}
