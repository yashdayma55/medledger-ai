import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { HistoryView } from "./HistoryView";

export default async function DoctorHistoryPage() {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    redirect("/auth/login/doctor");
  }

  return (
    <main className="min-h-screen bg-medledger-slate">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Patient history</h1>
        <Link href="/dashboard/doctor" className="text-slate-400 hover:text-white text-sm underline">
          ← Dashboard
        </Link>
      </header>
      <HistoryView />
    </main>
  );
}
