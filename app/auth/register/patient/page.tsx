import { PatientRegisterForm } from "./PatientRegisterForm";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function RegisterPatientPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Register as Patient
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Create your account. We’ll send a verification code to your email.
        </p>
      </div>
      <PatientRegisterForm errorFromUrl={errorFromUrl} />
    </main>
  );
}
