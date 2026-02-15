import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { extractTextFromPDF } from "@/lib/pdf-ingestion/parser";
import { processDocument } from "@/lib/pdf-ingestion/extractor";
import { mapRecordToPrefill } from "@/lib/pdf-ingestion/map-to-prefill";

const ARCHIVE_DIR = join(process.cwd(), "hackfax", "archive");
const ALLOWED_FILES = [
  "Cynthia-data-2-10-30-2024.pdf",
  "Cynthia-data-1-10-30-2024.pdf",
  "Cynthia-data-3-10-30-2024.pdf",
  "cynthia-data-1-rupert-braun.pdf",
  "cynthia-data-2-Steven-Franks.pdf",
];

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file") || "Cynthia-data-2-10-30-2024.pdf";
  if (!ALLOWED_FILES.includes(file)) {
    return NextResponse.json(
      { error: `Invalid file. Allowed: ${ALLOWED_FILES.join(", ")}` },
      { status: 400 }
    );
  }
  const filePath = join(ARCHIVE_DIR, file);
  try {
    const buffer = await readFile(filePath);
    const text = await extractTextFromPDF(buffer);
    const record = await processDocument(text);
    const prefill = mapRecordToPrefill(record);
    return NextResponse.json({
      success: true,
      record: {
        patientName: record.patientName,
        dob: record.dob,
        summary: record.summary.slice(0, 500),
        medications: record.medications,
        conditions: record.conditions,
        confidenceScore: record.confidenceScore,
      },
      prefill,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
