import type { RecordPayload } from "@/lib/types/medical-record";
import type { Encounter, TimelineEvent } from "@/lib/types/doctor-history";

/** Simple ref ranges to flag abnormal vitals (optional) */
const VITAL_REF = {
  bloodPressureSystolic: { min: 90, max: 140 },
  bloodPressureDiastolic: { min: 60, max: 90 },
  heartRate: { min: 60, max: 100 },
  temperature: { min: 36.1, max: 37.2 }, // °C
  oxygenSaturation: { min: 95, max: 100 },
} as const;

function isVitalAbnormal(
  key: keyof typeof VITAL_REF,
  value: number | undefined
): boolean {
  if (value == null || !Number.isFinite(value)) return false;
  const ref = VITAL_REF[key];
  return ref ? value < ref.min || value > ref.max : false;
}

type VitalEntry = NonNullable<RecordPayload["vitals"]>[number];

function vitalSummary(v: VitalEntry): string {
  const parts: string[] = [];
  if (v.bloodPressureSystolic != null && v.bloodPressureDiastolic != null)
    parts.push(`BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
  if (v.heartRate != null) parts.push(`HR ${v.heartRate}`);
  if (v.temperature != null) parts.push(`Temp ${v.temperature}°C`);
  if (v.oxygenSaturation != null) parts.push(`SpO2 ${v.oxygenSaturation}%`);
  if (v.weight != null) parts.push(`Wt ${v.weight} kg`);
  if (v.height != null) parts.push(`Ht ${v.height} cm`);
  return parts.length ? parts.join(", ") : "Vitals recorded";
}

export function recordToEncounter(
  id: string,
  recordDate: string,
  title: string,
  summary: string | null,
  sourceFile: string | null,
  confidenceScore: number | null,
  payload: RecordPayload | null
): Encounter {
  const events: TimelineEvent[] = [];
  const recordId = id;
  const dateTime = payload?.admission?.admissionDate || recordDate;

  events.push({
    id: `${recordId}-enc`,
    type: "encounter",
    date: recordDate,
    label: title,
    summary: summary ?? undefined,
    payload: payload?.admission,
  });

  if (payload?.vitals?.length) {
    for (let i = 0; i < payload.vitals.length; i++) {
      const v = payload.vitals[i]!;
      const abnormal =
        isVitalAbnormal("bloodPressureSystolic", v.bloodPressureSystolic) ||
        isVitalAbnormal("bloodPressureDiastolic", v.bloodPressureDiastolic) ||
        isVitalAbnormal("heartRate", v.heartRate) ||
        isVitalAbnormal("temperature", v.temperature) ||
        isVitalAbnormal("oxygenSaturation", v.oxygenSaturation);
      events.push({
        id: `${recordId}-vitals-${i}`,
        type: "labs",
        date: v.recordedAt || recordDate,
        label: "Vitals",
        summary: vitalSummary(v),
        abnormal,
        payload: v,
      });
    }
  }

  if (payload?.medications?.length) {
    payload.medications.forEach((m, i) => {
      events.push({
        id: `${recordId}-med-${i}`,
        type: "medications",
        date: recordDate,
        label: m.name ?? "Medication",
        summary: [m.dosage, m.frequency].filter(Boolean).join(" · ") || undefined,
        payload: m,
      });
    });
  }

  if (payload?.medicalHistory?.conditions?.length) {
    payload.medicalHistory.conditions.forEach((c, i) => {
      events.push({
        id: `${recordId}-cond-${i}`,
        type: "conditions",
        date: recordDate,
        label: c.name ?? "Condition",
        summary: c.status ?? undefined,
        severity: c.notes ?? undefined,
        payload: c,
      });
    });
  }

  const noteParts: string[] = [];
  if (payload?.clinicalSummary?.summary) noteParts.push(payload.clinicalSummary.summary);
  if (payload?.clinicalSummary?.presentingIllness) noteParts.push(payload.clinicalSummary.presentingIllness);
  if (payload?.clinicalSummary?.historyOfPresentIllness) noteParts.push(payload.clinicalSummary.historyOfPresentIllness);
  if (noteParts.length) {
    events.push({
      id: `${recordId}-notes`,
      type: "notes",
      date: recordDate,
      label: "Clinical summary",
      summary: noteParts.join(" ").slice(0, 200) + (noteParts.join(" ").length > 200 ? "…" : ""),
      payload: payload?.clinicalSummary,
    });
  }

  if (sourceFile) {
    events.push({
      id: `${recordId}-doc`,
      type: "documents",
      date: recordDate,
      label: "Document",
      summary: sourceFile,
      payload: { url: sourceFile, name: sourceFile },
    });
  }

  return {
    id: recordId,
    date: recordDate,
    title,
    summary,
    facility: undefined,
    clinician: undefined,
    complaint: payload?.admission?.chiefComplaint ?? undefined,
    diagnosis: payload?.clinicalSummary?.summary ?? undefined,
    sourceFile,
    confidenceScore: confidenceScore ?? undefined,
    events,
    payload,
  };
}
