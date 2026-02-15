import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function PatientDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "patient") {
    redirect("/auth/login/patient");
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
    .from("patient_profile")
    .select("full_name, dob, sex_at_birth, preferred_language")
    .eq("user_id", session.sub)
    .single();

  const { data: records } = await db
    .from("patient_medical_records")
    .select("id, title, record_date, summary, created_at")
    .eq("patient_user_id", session.sub)
    .order("record_date", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-medledger-slate">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Patient dashboard</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-slate-400 hover:text-white text-sm underline"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        {/* Basic details */}
        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Your details
          </h2>
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500 text-sm">Full name</span>
                <p className="text-white font-medium">
                  {profile?.full_name ?? "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-sm">Email</span>
                <p className="text-white font-medium">{session.email}</p>
              </div>
              <div>
                <span className="text-slate-500 text-sm">Date of birth</span>
                <p className="text-white font-medium">
                  {profile?.dob ? new Date(profile.dob).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-sm">Sex at birth</span>
                <p className="text-white font-medium capitalize">
                  {profile?.sex_at_birth ?? "—"}
                </p>
              </div>
              {profile?.preferred_language && (
                <div>
                  <span className="text-slate-500 text-sm">Preferred language</span>
                  <p className="text-white font-medium">{profile.preferred_language}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Medical history - view only */}
        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Medical history
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            View-only. Records are added by your providers and shown here for your reference.
          </p>
          {!records?.length ? (
            <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-8 text-center text-slate-400">
              <p>No medical records yet.</p>
              <p className="text-sm mt-2">
                When your providers add records, they will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-600 bg-medledger-slate-light p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-white">{r.title}</span>
                    <span className="text-slate-500 text-sm">
                      {new Date(r.record_date).toLocaleDateString()}
                    </span>
                  </div>
                  {r.summary && (
                    <p className="text-slate-400 text-sm mt-2">{r.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
