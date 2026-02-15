import { ProviderRegisterForm } from "./ProviderRegisterForm";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function RegisterProviderPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const errorFromUrl = typeof error === "string" ? decodeURIComponent(error) : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-white">
          Register as doctor
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Create your provider account. We verify by email; no NPI API—admin approval required for full access.
        </p>
      </div>
      <ProviderRegisterForm errorFromUrl={errorFromUrl} />
    </main>
  );
}
