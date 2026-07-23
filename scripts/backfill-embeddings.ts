/**
 * Backfill embeddings for all existing patient_medical_records.
 * Run: npm run backfill:embeddings
 * Requires OPENAI_API_KEY (preferred) or GEMINI_API_KEY in .env.local,
 * plus Supabase URL + service role key, and migration 006 applied.
 */
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

config({ path: join(root, ".env.local") });

async function main() {
  const { supabaseAdmin } = await import("../lib/supabase/server");
  if (!supabaseAdmin) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
  if (!hasOpenAi && !hasGemini) {
    console.error("Set OPENAI_API_KEY (preferred) or GEMINI_API_KEY in .env.local");
    process.exit(1);
  }

  console.log(
    `Embedding provider: ${hasOpenAi ? "OpenAI text-embedding-3-small" : "Gemini gemini-embedding-001"}`
  );

  const { data: records, error } = await supabaseAdmin
    .from("patient_medical_records")
    .select("id, title, record_date")
    .order("record_date", { ascending: true });

  if (error) {
    console.error("Failed to list records:", error.message);
    process.exit(1);
  }

  const rows = records ?? [];
  console.log(`Found ${rows.length} medical record(s) to index.\n`);

  const { indexMedicalRecord } = await import("../lib/rag/index-record");

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const label = `[${i + 1}/${rows.length}] ${row.record_date} — ${row.title} (${row.id})`;
    process.stdout.write(`${label} ... `);
    try {
      await indexMedicalRecord(row.id as string);
      console.log("ok");
      ok += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`FAILED: ${message.slice(0, 200)}`);
      failed += 1;
    }
  }

  console.log(`\nDone. Indexed ${ok}, failed ${failed}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
