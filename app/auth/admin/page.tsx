import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CreateFirstAdminForm } from "./CreateFirstAdminForm";
import { AdminLoginForm } from "./AdminLoginForm";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function AdminAuthPage({ searchParams }: Props) {
  const { error, message } = await searchParams;
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;
  const successMessage = typeof message === "string" ? decodeURIComponent(message) : null;

  if (!supabaseAdmin) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-red-400">Server configuration error.</p>
      </main>
    );
  }

  const { count } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("role", ["admin", "superuser"]);

  const hasAdmin = (count ?? 0) > 0;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center space-y-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Super Admin
        </h1>
        <p className="text-slate-400 text-sm">
          {hasAdmin
            ? "Sign in to manage the platform."
            : "No admin exists yet. Create the first super admin below."}
        </p>

        {successMessage && (
          <p className="text-teal-400 text-sm" role="status">
            {successMessage}
          </p>
        )}

        {hasAdmin ? (
          <AdminLoginForm errorFromUrl={errorFromUrl} />
        ) : (
          <CreateFirstAdminForm errorFromUrl={errorFromUrl} />
        )}

        <p>
          <Link href="/" className="text-teal-400 hover:text-teal-300 underline text-sm">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
