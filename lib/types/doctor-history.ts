import type { RecordPayload } from "./medical-record";

/** One record row from Supabase = one encounter (visit/consultation) */
export type HistoryRecordRow = {
  id: string;
  patient_user_id: string;
  provider_user_id: string | null;
  title: string;
  record_date: string;
  summary: string | null;
  fhir_lite_json: RecordPayload | null;
  created_at: string;
  source_file: string | null;
  confidence_score: number | null;
};

/** Event types for filtering and display */
export type HistoryEventType =
  | "encounter"
  | "labs"
  | "medications"
  | "allergies"
  | "conditions"
  | "notes"
  | "documents";

/** Single timeline event (could be encounter header or nested item) */
export type TimelineEvent = {
  id: string;
  type: HistoryEventType;
  date: string; // ISO date or datetime
  label: string;
  summary?: string;
  abnormal?: boolean;
  severity?: string;
  payload?: unknown;
};

/** One encounter (hospital visit / consultation) with nested events */
export type Encounter = {
  id: string;
  date: string;
  title: string;
  summary: string | null;
  facility?: string;
  clinician?: string;
  complaint?: string;
  diagnosis?: string;
  sourceFile?: string | null;
  confidenceScore?: number | null;
  events: TimelineEvent[];
  payload: RecordPayload | null;
};

/** Patient option for doctor's dropdown */
export type PatientOption = {
  patient_user_id: string;
  full_name: string | null;
  email: string | null;
  record_count: number;
};

/** Result of fetching history (with query log for debugging) */
export type PatientHistoryResult = {
  encounters: Encounter[];
  patientName: string | null;
  queryLog: string[];
  error?: string;
};
