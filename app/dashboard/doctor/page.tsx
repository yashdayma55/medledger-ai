import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signOut } from "./actions";

type Props = { searchParams: Promise<{ success?: string }> };

export default async function DoctorDashboardPage({ searchParams }: Props) {
  const session = await getSession();
  const { success } = await searchParams;
  if (!session || session.role !== "provider") {
    redirect("/auth/login/doctor");
  }

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-red-400">Server configuration error.</p>
      </main>
    );
  }
  const db = supabaseAdmin;

  const { data: profile } = await db
    .from("provider_profile")
    .select("display_name, npi_number, verification_status, clinic_name, specialty_primary")
    .eq("user_id", session.sub)
    .single();

  const isPendingVerification = profile?.verification_status === "pending";

  return (
    <main className="min-h-screen bg-medledger-slate">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Provider dashboard</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-slate-400 hover:text-white text-sm underline"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {success === "record_created" && (
          <div className="rounded-xl border border-teal-500/50 bg-teal-500/10 px-4 py-3 text-teal-200 text-sm">
            Medical record created successfully.
          </div>
        )}
        {isPendingVerification && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
            <strong>Pending admin verification.</strong> Your account is under review. You’ll have full access once an admin approves your profile. No NPI API is used—approval is manual.
          </div>
        )}

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Your details
          </h2>
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 text-sm">Display name</span>
                <p className="text-white font-medium">{profile?.display_name ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm">Email</span>
                <p className="text-white font-medium">{session.email}</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm">NPI number</span>
                <p className="text-white font-medium">{profile?.npi_number ?? "—"}</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm">Verification status</span>
                <p className="text-white font-medium capitalize">{profile?.verification_status ?? "—"}</p>
              </div>
              {profile?.clinic_name && (
                <div>
                  <span className="text-slate-500 text-sm">Clinic / practice</span>
                  <p className="text-white font-medium">{profile.clinic_name}</p>
                </div>
              )}
              {profile?.specialty_primary && (
                <div>
                  <span className="text-slate-500 text-sm">Primary specialty</span>
                  <p className="text-white font-medium">{profile.specialty_primary}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Medical records
          </h2>
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
            <p className="text-slate-400 text-sm">
              Create a new medical record for a patient. You can link an existing patient or create a new one.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard/doctor/records/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition"
              >
                Create medical record
              </a>
              <a
                href="/dashboard/doctor/history"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-500 bg-medledger-slate px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                Patient history
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
