"use server";

import { extractTextFromPDF } from "@/lib/pdf-ingestion/parser";
import { processDocumentWithExtras } from "@/lib/pdf-ingestion/extractor";
import { mapRecordToPrefill, type RecordPrefill } from "@/lib/pdf-ingestion/map-to-prefill";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPE = "application/pdf";

export type ParsePdfResult =
  | { success: true; data: RecordPrefill }
  | { success: false; error: string };

export type { RecordPrefill };

export async function parsePdfForRecord(formData: FormData): Promise<ParsePdfResult> {
  const file = formData.get("pdf_file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a PDF file." };
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return { success: false, error: "PDF must be 10MB or smaller." };
  }
  const type = file.type?.toLowerCase() ?? "";
  if (type !== ALLOWED_TYPE && !file.name?.toLowerCase().endsWith(".pdf")) {
    return { success: false, error: "File must be a PDF." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromPDF(buffer);
    const extraction = await processDocumentWithExtras(text);
    const data = mapRecordToPrefill(extraction);
    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse PDF.";
    return { success: false, error: message };
  }
}
