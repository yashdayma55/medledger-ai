import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero + description */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white">
            MedLedger-AI
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
            A distributed intelligence-driven healthcare ecosystem. We turn
            fragmented medical data into a single, actionable view—so clinicians
            get from records to insight in seconds, and patients stay in control
            of their health data.
          </p>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Secure login, role-based access, patient-authorized edits via OTP,
            document upload and AI extraction, and a visual timeline of care.
          </p>
        </div>

        {/* Three entry buttons */}
        <div className="mt-14 flex flex-col sm:flex-row gap-4 sm:gap-6 max-w-2xl w-full justify-center items-stretch sm:items-center">
          <Link
            href="/auth/patient"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-medledger-slate"
          >
            <span aria-hidden className="text-xl">👤</span>
            Register or Login as Patient
          </Link>
          <Link
            href="/auth/doctor"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-teal-500 bg-transparent px-6 py-4 text-base font-semibold text-teal-400 transition hover:bg-teal-500/10 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-medledger-slate"
          >
            <span aria-hidden className="text-xl">🩺</span>
            Register or Login as Doctor
          </Link>
          <Link
            href="/auth/admin"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-500 bg-medledger-slate-light px-6 py-4 text-base font-semibold text-slate-200 transition hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-medledger-slate"
          >
            <span aria-hidden className="text-xl">⚙️</span>
            Login as Super Admin
          </Link>
        </div>
      </section>

      <footer className="py-6 text-center text-slate-500 text-sm">
        MedLedger-AI — Prototype. Use synthetic data only.
      </footer>
    </main>
  );
}
