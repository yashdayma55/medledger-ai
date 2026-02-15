/**
 * Standalone test: parse a PDF from hackfax/archive and run extraction.
 * Run: npx tsx scripts/test-pdf-parse.ts [filename]
 * Example: npx tsx scripts/test-pdf-parse.ts Cynthia-data-2-10-30-2024.pdf
 * Requires AZURE_OPENAI_* in .env.local (Azure OpenAI)
 */
import { config } from "dotenv";
import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load .env.local from project root
config({ path: join(root, ".env.local") });

const ALLOWED = [
  "Cynthia-data-2-10-30-2024.pdf",
  "Cynthia-data-1-10-30-2024.pdf",
  "Cynthia-data-3-10-30-2024.pdf",
  "cynthia-data-1-rupert-braun.pdf",
  "cynthia-data-2-Steven-Franks.pdf",
];

async function main() {
  const file = process.argv[2] || "Cynthia-data-2-10-30-2024.pdf";
  if (!ALLOWED.includes(file)) {
    console.error("Allowed files:", ALLOWED.join(", "));
    process.exit(1);
  }
  const hasAzure =
    (process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_API_KEY)?.trim() &&
    (process.env.AZURE_OPENAI_RESOURCE_NAME || process.env.AZURE_RESOURCE_NAME)?.trim() &&
    (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || process.env.AZURE_DEPLOYMENT_NAME)?.trim();
  const textOnly = process.argv.includes("--text-only");

  const filePath = join(root, "hackfax", "archive", file);
  console.log("Reading:", filePath);

  const buffer = await readFile(filePath);
  const { extractTextFromPDF } = await import("../lib/pdf-ingestion/parser");

  console.log("Extracting text...");
  const text = await extractTextFromPDF(buffer);
  console.log("Text length:", text.length, "chars");
  console.log("\n--- First 800 chars ---\n");
  console.log(text.slice(0, 800));

  if (textOnly) {
    console.log("\nDone (--text-only, skipping LLM).");
    return;
  }

  if (!hasAzure) {
    console.error(
      "\nSet AZURE_OPENAI_API_KEY, AZURE_OPENAI_RESOURCE_NAME, and AZURE_OPENAI_DEPLOYMENT_NAME in .env.local for full extraction."
    );
    process.exit(1);
  }

  const { processDocument } = await import("../lib/pdf-ingestion/extractor");
  const { mapRecordToPrefill } = await import("../lib/pdf-ingestion/map-to-prefill");

  console.log("\nRunning LLM extraction...");
  const record = await processDocument(text);
  const prefill = mapRecordToPrefill(record);

  console.log("\n--- Extracted record ---");
  console.log(
    JSON.stringify(
      {
        patientName: record.patientName,
        dob: record.dob,
        confidenceScore: record.confidenceScore,
        conditions: record.conditions,
        medications: record.medications,
      },
      null,
      2
    )
  );
  console.log("\n--- Prefill (form fields) ---");
  console.log(JSON.stringify(prefill, null, 2));
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
