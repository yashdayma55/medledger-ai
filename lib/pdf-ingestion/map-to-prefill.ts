import type { PatientRecord } from "./schema";
import type { GeminiExtraction } from "./schema";

/** Prefill keys matching form input names for Create Medical Record */
export type RecordPrefill = {
  full_name?: string;
  dob?: string;
  patient_first_name?: string;
  patient_middle_initial?: string;
  patient_last_name?: string;
  patient_dob?: string;
  patient_gender?: string;
  patient_phone?: string;
  patient_contact_email?: string;
  summary?: string;
  clinical_summary?: string;
  presenting_illness?: string;
  history_of_present_illness?: string;
  conditions_json?: string;
  medications_json?: string;
  confidence_score?: string;
  title?: string;
  record_date?: string;
  admission_date?: string;
  discharge_date?: string;
  chief_complaint?: string;
  vital_bp_systolic?: string;
  vital_bp_diastolic?: string;
  vital_heart_rate?: string;
  vital_temperature?: string;
  vital_oxygen_saturation?: string;
  vital_weight?: string;
  vital_height?: string;
};

function splitFullName(fullName: string): { first: string; middle?: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0]!, last: "" };
  if (parts.length === 2) return { first: parts[0]!, last: parts[1]! };
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  const middle = parts.slice(1, -1).join(" ");
  return { first, middle: middle || undefined, last };
}

function medsToJson(medications: { name: string; dosage: string; frequency?: string }[]): string {
  return JSON.stringify(
    medications.map((m) => ({
      name: m.name,
      dosage: m.dosage,
      route: "PO",
      frequency: m.frequency ?? "As prescribed",
      indication: "",
    })),
    null,
    2
  );
}

function conditionsToJson(conditions: string[]): string {
  return JSON.stringify(
    conditions.map((name) => ({ name, icdCode: "", status: "Active", notes: "" })),
    null,
    2
  );
}

export function mapRecordToPrefill(record: PatientRecord | GeminiExtraction): RecordPrefill {
  const { first, middle, last } = splitFullName(record.patientName);
  const summary = record.summary.slice(0, 2000);
  const prefill: RecordPrefill = {
    full_name: record.patientName,
    dob: record.dob,
    patient_first_name: first,
    patient_last_name: last,
    patient_middle_initial: middle?.charAt(0) ?? undefined,
    patient_dob: record.dob,
    summary,
    clinical_summary: summary,
    confidence_score: String(record.confidenceScore),
  };

  if (record.conditions.length > 0) {
    prefill.conditions_json = conditionsToJson(record.conditions);
  }
  if (record.medications.length > 0) {
    prefill.medications_json = medsToJson(
      record.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: (m as { frequency?: string }).frequency ?? "As prescribed",
      }))
    );
  }

  const ext = record as GeminiExtraction;
  if (ext.recordTitle) prefill.title = ext.recordTitle;
  if (ext.admissionDate) {
    prefill.admission_date = normDate(ext.admissionDate);
    prefill.record_date = prefill.record_date ?? prefill.admission_date;
  }
  if (ext.dischargeDate) prefill.discharge_date = normDate(ext.dischargeDate);
  if (ext.chiefComplaint) prefill.chief_complaint = ext.chiefComplaint;
  if (ext.presentingIllness) prefill.presenting_illness = ext.presentingIllness;
  if (ext.historyOfPresentIllness) prefill.history_of_present_illness = ext.historyOfPresentIllness;
  if (!prefill.record_date) prefill.record_date = new Date().toISOString().slice(0, 10);

  const v = ext.vitals;
  if (v) {
    if (v.bloodPressureSystolic != null) prefill.vital_bp_systolic = String(v.bloodPressureSystolic);
    if (v.bloodPressureDiastolic != null) prefill.vital_bp_diastolic = String(v.bloodPressureDiastolic);
    if (v.heartRate != null) prefill.vital_heart_rate = String(v.heartRate);
    if (v.temperature != null) prefill.vital_temperature = String(v.temperature);
    if (v.oxygenSaturation != null) prefill.vital_oxygen_saturation = String(v.oxygenSaturation);
    if (v.weight != null) prefill.vital_weight = String(v.weight);
    if (v.height != null) prefill.vital_height = String(v.height);
  }

  return prefill;
}

function normDate(s: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  } catch {
    // ignore
  }
  return s;
}
