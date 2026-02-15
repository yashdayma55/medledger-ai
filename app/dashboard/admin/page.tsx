import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signOut, verifyProvider, rejectProvider } from "./actions";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "superuser")) {
    redirect("/auth/admin");
  }

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-red-400">Server configuration error.</p>
      </main>
    );
  }
  const db = supabaseAdmin;

  const { data: pendingProviders } = await db
    .from("provider_profile")
    .select("user_id, display_name, npi_number, clinic_name, specialty_primary, verification_status")
    .eq("verification_status", "pending");

  const pendingEmails: Record<string, string> = {};
  if (pendingProviders?.length) {
    const ids = pendingProviders.map((p) => p.user_id);
    const { data: users } = await db
      .from("users")
      .select("id, email")
      .in("id", ids);
    users?.forEach((u) => {
      pendingEmails[u.id] = u.email;
    });
  }

  const { data: allProviders } = await db
    .from("provider_profile")
    .select("user_id, display_name, npi_number, verification_status, verified_at")
    .order("display_name", { ascending: true });

  const { count: patientCount } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "patient");

  const { count: providerCount } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "provider");

  return (
    <main className="min-h-screen bg-medledger-slate">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Super Admin Dashboard</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-slate-400 hover:text-white text-sm underline"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-4">
            <p className="text-slate-500 text-sm">Patients</p>
            <p className="text-2xl font-bold text-white">{patientCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-4">
            <p className="text-slate-500 text-sm">Providers</p>
            <p className="text-2xl font-bold text-white">{providerCount ?? 0}</p>
          </div>
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-4">
            <p className="text-slate-500 text-sm">Pending verification</p>
            <p className="text-2xl font-bold text-amber-400">{pendingProviders?.length ?? 0}</p>
          </div>
        </section>

        {/* Pending providers */}
        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Pending provider verification
          </h2>
          {!pendingProviders?.length ? (
            <div className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 text-center text-slate-400">
              No providers pending verification.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProviders.map((p: { user_id: string; display_name: string; npi_number: string; clinic_name: string | null; specialty_primary: string | null }) => {
                const email = pendingEmails[p.user_id] ?? "—";
                return (
                  <div
                    key={p.user_id}
                    className="rounded-xl border border-slate-600 bg-medledger-slate-light p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-white">{p.display_name}</p>
                      <p className="text-slate-400 text-sm">{email}</p>
                      <p className="text-slate-500 text-sm">
                        NPI: {p.npi_number}
                        {p.clinic_name && ` • ${p.clinic_name}`}
                        {p.specialty_primary && ` • ${p.specialty_primary}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={verifyProvider.bind(null, p.user_id)}>
                        <button
                          type="submit"
                          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
                        >
                          Verify
                        </button>
                      </form>
                      <form action={rejectProvider.bind(null, p.user_id)}>
                        <button
                          type="submit"
                          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* All providers */}
        <section>
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            All providers
          </h2>
          <div className="rounded-xl border border-slate-600 bg-medledger-slate-light overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="px-4 py-3 text-slate-400 text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-slate-400 text-sm font-medium">NPI</th>
                  <th className="px-4 py-3 text-slate-400 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {allProviders?.map((p: { user_id: string; display_name: string; npi_number: string; verification_status: string; verified_at: string | null }) => (
                  <tr key={p.user_id} className="border-b border-slate-700 last:border-0">
                    <td className="px-4 py-3 text-white">{p.display_name}</td>
                    <td className="px-4 py-3 text-slate-300">{p.npi_number}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          p.verification_status === "verified"
                            ? "bg-teal-500/20 text-teal-400"
                            : p.verification_status === "rejected"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {p.verification_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!allProviders?.length && (
              <p className="px-4 py-6 text-slate-500 text-center">No providers yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
