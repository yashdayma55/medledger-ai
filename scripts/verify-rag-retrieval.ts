/**
 * Manual RAG smoke test: retrieve top chunks for a patient + query.
 * Run after migration 006 and `npm run backfill:embeddings`.
 *
 * Usage:
 *   npx tsx scripts/verify-rag-retrieval.ts <patientUserId> [query]
 *
 * Example:
 *   npx tsx scripts/verify-rag-retrieval.ts 00000000-0000-0000-0000-000000000000 "what medications is the patient on"
 */
import { config } from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.local") });

async function main() {
  const patientUserId = process.argv[2];
  const query =
    process.argv[3] ||
    "overall clinical summary, key problems, current medications, red flags";

  if (!patientUserId) {
    console.error(
      "Usage: npx tsx scripts/verify-rag-retrieval.ts <patientUserId> [query]"
    );
    process.exit(1);
  }

  const { retrieveRelevantChunks } = await import("../lib/rag/retrieve");
  console.log("Patient:", patientUserId);
  console.log("Query:", query);
  console.log("---");

  const chunks = await retrieveRelevantChunks(patientUserId, query);
  if (chunks.length === 0) {
    console.log("No chunks returned. Has migration 006 been applied and backfill run?");
    process.exit(1);
  }

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const sim =
      c.similarity != null ? ` similarity=${c.similarity.toFixed(4)}` : "";
    console.log(`\n[${i + 1}] type=${c.chunk_type}${sim}`);
    console.log(c.chunk_text.slice(0, 400) + (c.chunk_text.length > 400 ? "…" : ""));
  }

  console.log(`\nRetrieved ${chunks.length} chunk(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
