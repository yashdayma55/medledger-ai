import Link from "next/link";

export default function DoctorAuthHubPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Doctor / Provider portal
        </h1>
        <p className="text-slate-400 text-sm">
          Register as a healthcare provider or sign in. New providers are reviewed by an admin before full access (no NPI API—we keep it simple).
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/auth/register/provider"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-medledger-slate"
          >
            Register as doctor
          </Link>
          <Link
            href="/auth/login/doctor"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-teal-500 bg-transparent px-6 py-4 text-base font-semibold text-teal-400 transition hover:bg-teal-500/10 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-medledger-slate"
          >
            Login as doctor
          </Link>
        </div>

        <p>
          <Link href="/" className="text-teal-400 hover:text-teal-300 underline text-sm">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
