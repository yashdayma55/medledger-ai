import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  GeminiExtractionSchema,
  PatientRecordSchema,
  type GeminiExtraction,
  type PatientRecord,
} from "./schema";

export class ExtractionError extends Error {
  constructor(
    message: string,
    public cause?: Error,
    public validationErrors?: string[]
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

const SYSTEM_PROMPT = `You are an expert medical data entry specialist. Extract structured information from medical record text into JSON.

Required:
1. patientName: Full name of the patient
2. dob: Date of birth in YYYY-MM-DD (infer from age if only age is given)
3. summary: Concise clinical summary, 10-2000 characters
4. medications: Array of { name, dosage, frequency } for each medication (use "As prescribed" for frequency if not stated)
5. conditions: Array of diagnosed medical condition strings
6. confidenceScore: Your confidence in the extraction, 0-100

Optional (extract if present in the document):
- recordTitle: Document type or title (e.g. "Admission note", "Discharge summary")
- admissionDate: Admission date YYYY-MM-DD
- dischargeDate: Discharge date YYYY-MM-DD
- chiefComplaint: Chief complaint or reason for visit
- presentingIllness: Presenting illness description
- historyOfPresentIllness: History of present illness (HPI)
- vitals: Object with any of: bloodPressureSystolic, bloodPressureDiastolic (numbers), heartRate, temperature (Celsius), oxygenSaturation, weight (kg), height (cm)

Rules: Use empty arrays when not stated; be conservative with confidence; return only valid JSON.`;

const TEXT_SLICE = 40000;

/** Choose provider: OpenAI if OPENAI_API_KEY is set, otherwise Gemini. */
function getModel() {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return openai("gpt-4o-mini");
  }
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!geminiKey) {
    throw new ExtractionError(
      "No API key set. Add OPENAI_API_KEY or GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) to .env.local."
    );
  }
  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  return google("gemini-2.0-flash");
}

async function runExtraction(text: string): Promise<GeminiExtraction> {
  const model = getModel();
  const result = await generateObject({
    model,
    schema: GeminiExtractionSchema,
    system: SYSTEM_PROMPT,
    prompt: `Extract structured patient data from this medical record:\n\n${text.slice(0, TEXT_SLICE)}`,
    maxRetries: 1,
  });
  const raw = result.object as GeminiExtraction;
  return GeminiExtractionSchema.parse(raw);
}

function isQuotaError(message: string): boolean {
  return (
    message.includes("quota") ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota exceeded")
  );
}

function formatQuotaMessage(raw: string): string {
  const match = raw.match(/[Pp]lease retry in ([\d.]+)s/);
  const seconds = match ? Math.ceil(Number(match[1])) : 60;
  return `Rate limit reached. Please wait ${seconds} seconds and try again.`;
}

function normalizeDob(s: string): string {
  const trimmed = (s || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    // ignore
  }
  return trimmed || new Date().toISOString().slice(0, 10);
}

function toPatientRecord(extracted: GeminiExtraction): PatientRecord {
  return PatientRecordSchema.parse({
    patientName: extracted.patientName || "Unknown",
    dob: normalizeDob(extracted.dob),
    summary: (extracted.summary || "").slice(0, 20000) || "No summary extracted.",
    medications: (extracted.medications || []).map((m) => ({
      name: m.name || "Unknown",
      dosage: m.dosage || "",
      frequency: m.frequency || "As prescribed",
    })),
    conditions: (extracted.conditions || []).filter(Boolean),
    confidenceScore: Math.min(100, Math.max(0, Number(extracted.confidenceScore) || 70)),
  });
}

function toFullExtraction(parsed: GeminiExtraction): GeminiExtraction {
  return {
    ...parsed,
    patientName: parsed.patientName || "Unknown",
    dob: normalizeDob(parsed.dob),
    summary: (parsed.summary || "").slice(0, 20000) || "No summary extracted.",
    medications: (parsed.medications || []).map((m) => ({
      name: m.name || "Unknown",
      dosage: m.dosage || "",
      frequency: m.frequency ?? "As prescribed",
    })),
    conditions: (parsed.conditions || []).filter(Boolean),
    confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 70)),
  };
}

/**
 * Process raw medical record text and extract structured data (OpenAI or Gemini).
 * Returns PatientRecord for backward compatibility.
 */
export async function processDocument(text: string): Promise<PatientRecord> {
  if (!text || text.trim().length === 0) {
    throw new ExtractionError("Input text is empty");
  }
  try {
    const extracted = await runExtraction(text);
    return toPatientRecord(extracted);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isQuotaError(message)) {
      throw new ExtractionError(formatQuotaMessage(message));
    }
    if (err instanceof Error) throw err;
    throw new ExtractionError(String(err));
  }
}

/**
 * Returns extended extraction for form prefill (title, admission, chief complaint, vitals, etc.).
 */
export async function processDocumentWithExtras(text: string): Promise<GeminiExtraction> {
  if (!text || text.trim().length === 0) {
    throw new ExtractionError("Input text is empty");
  }
  try {
    const parsed = await runExtraction(text);
    return toFullExtraction(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isQuotaError(message)) {
      throw new ExtractionError(formatQuotaMessage(message));
    }
    throw err;
  }
}

export function validatePatientRecord(data: unknown): PatientRecord {
  return PatientRecordSchema.parse(data);
}
