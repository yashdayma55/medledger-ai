import { z } from "zod";

const MedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
});

export const PatientRecordSchema = z.object({
  patientName: z.string().min(1),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().min(1).max(20000),
  medications: z.array(MedicationSchema).default([]),
  conditions: z.array(z.string().min(1)).default([]),
  confidenceScore: z.number().min(0).max(100),
});

export type PatientRecord = z.infer<typeof PatientRecordSchema>;

/**
 * Schema for xAI/Grok API: no minLength, maxLength, minItems, maxItems, or pattern
 * (xAI structured output rejects those). Use for generateObject; then validate with PatientRecordSchema.
 */
export const PatientRecordWireSchema = z.object({
  patientName: z.string(),
  dob: z.string(),
  summary: z.string(),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
    })
  ),
  conditions: z.array(z.string()),
  confidenceScore: z.number(),
});

/**
 * Schema for OpenAI structured output: every key must be in "required" and present.
 * Use .nullable() for optional fields so the key is always supplied (value can be null).
 */
export const GeminiExtractionSchema = z.object({
  patientName: z.string(),
  dob: z.string(),
  summary: z.string(),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
    })
  ),
  conditions: z.array(z.string()),
  confidenceScore: z.number(),
  recordTitle: z.string().nullable(),
  admissionDate: z.string().nullable(),
  dischargeDate: z.string().nullable(),
  chiefComplaint: z.string().nullable(),
  presentingIllness: z.string().nullable(),
  historyOfPresentIllness: z.string().nullable(),
  vitals: z
    .object({
      bloodPressureSystolic: z.number().nullable(),
      bloodPressureDiastolic: z.number().nullable(),
      heartRate: z.number().nullable(),
      temperature: z.number().nullable(),
      oxygenSaturation: z.number().nullable(),
      weight: z.number().nullable(),
      height: z.number().nullable(),
    })
    .nullable(),
});

export type GeminiExtraction = z.infer<typeof GeminiExtractionSchema>;
