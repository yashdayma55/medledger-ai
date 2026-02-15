import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { NewRecordForm } from "./NewRecordForm";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function NewRecordPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    redirect("/auth/login/doctor");
  }

  const { error, success } = await searchParams;
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;

  return (
    <main className="min-h-screen bg-medledger-slate">
      <header className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-white">Create medical record</h1>
        <Link href="/dashboard/doctor" className="text-slate-400 hover:text-white text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-slate-400 text-sm mb-8">
          Fill in the record details below. Choose an existing patient (by email) or create a new patient account. You can optionally attach an EHR file.
        </p>
        <NewRecordForm errorFromUrl={errorFromUrl} />
      </div>
    </main>
  );
}
