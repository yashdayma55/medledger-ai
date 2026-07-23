import type { RecordPayload } from "@/lib/types/medical-record";

export type RecordChunkInput = {
  chunk_type: string;
  chunk_text: string;
};

type ChunkableRecord = {
  id: string;
  record_date: string;
  title: string;
  summary?: string | null;
  fhir_lite_json: RecordPayload | null | undefined;
};

function prefix(recordDate: string, title: string, section: string): string {
  return `[${recordDate}] ${title} — ${section}`;
}

/** Format vitals the same way as doctor-history/normalize.ts vitalSummary. */
function formatVital(v: NonNullable<RecordPayload["vitals"]>[number]): string {
  const parts: string[] = [];
  if (v.bloodPressureSystolic != null && v.bloodPressureDiastolic != null) {
    parts.push(`BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
  }
  if (v.heartRate != null) parts.push(`HR ${v.heartRate}`);
  if (v.temperature != null) parts.push(`Temp ${v.temperature}°C`);
  if (v.oxygenSaturation != null) parts.push(`SpO2 ${v.oxygenSaturation}%`);
  if (v.weight != null) parts.push(`Wt ${v.weight} kg`);
  if (v.height != null) parts.push(`Ht ${v.height} cm`);
  if (v.recordedAt) parts.push(`(recorded ${v.recordedAt})`);
  return parts.length ? parts.join(", ") : "Vitals recorded";
}

/**
 * Split one medical record into section-level chunks for embedding.
 * Reuses the same fhir_lite_json field paths as lib/doctor-history/normalize.ts.
 */
export function chunkRecord(record: ChunkableRecord): RecordChunkInput[] {
  const payload = record.fhir_lite_json ?? null;
  const date = record.record_date;
  const title = record.title || "Medical record";
  const chunks: RecordChunkInput[] = [];

  // Encounter meta: title, row summary, chief complaint, admission dates
  const metaParts: string[] = [];
  if (record.summary) metaParts.push(`Summary: ${record.summary}`);
  if (payload?.admission?.chiefComplaint) {
    metaParts.push(`Chief complaint: ${payload.admission.chiefComplaint}`);
  }
  if (payload?.admission?.admissionDate) {
    metaParts.push(`Admission date: ${payload.admission.admissionDate}`);
  }
  if (payload?.admission?.dischargeDate) {
    metaParts.push(`Discharge date: ${payload.admission.dischargeDate}`);
  }
  if (payload?.admission?.admissionType) {
    metaParts.push(`Admission type: ${payload.admission.admissionType}`);
  }
  if (metaParts.length) {
    chunks.push({
      chunk_type: "encounter_meta",
      chunk_text: `${prefix(date, title, "Encounter")}: ${metaParts.join(". ")}`,
    });
  }

  // Clinical summary / HPI (same fields as normalize.ts noteParts)
  const clinicalParts: string[] = [];
  if (payload?.clinicalSummary?.summary) {
    clinicalParts.push(payload.clinicalSummary.summary);
  }
  if (payload?.clinicalSummary?.presentingIllness) {
    clinicalParts.push(`Presenting illness: ${payload.clinicalSummary.presentingIllness}`);
  }
  if (payload?.clinicalSummary?.historyOfPresentIllness) {
    clinicalParts.push(`HPI: ${payload.clinicalSummary.historyOfPresentIllness}`);
  }
  if (clinicalParts.length) {
    chunks.push({
      chunk_type: "clinicalSummary",
      chunk_text: `${prefix(date, title, "Clinical summary")}: ${clinicalParts.join(" ")}`,
    });
  }

  // Medications
  if (payload?.medications?.length) {
    const medLines = payload.medications.map((m) => {
      const detail = [m.dosage, m.frequency, m.route, m.status, m.indication]
        .filter(Boolean)
        .join(", ");
      return detail ? `${m.name ?? "Medication"} (${detail})` : (m.name ?? "Medication");
    });
    chunks.push({
      chunk_type: "medications",
      chunk_text: `${prefix(date, title, "Medications")}: ${medLines.join("; ")}`,
    });
  }

  // Medical history / conditions (+ surgical if present)
  const historyParts: string[] = [];
  if (payload?.medicalHistory?.conditions?.length) {
    for (const c of payload.medicalHistory.conditions) {
      const detail = [c.status, c.icdCode, c.notes].filter(Boolean).join(", ");
      historyParts.push(
        detail ? `${c.name ?? "Condition"} (${detail})` : (c.name ?? "Condition")
      );
    }
  }
  if (payload?.medicalHistory?.surgicalHistory?.length) {
    for (const s of payload.medicalHistory.surgicalHistory) {
      const detail = [s.date, s.outcome].filter(Boolean).join(", ");
      historyParts.push(
        detail
          ? `Surgery: ${s.procedureName ?? "procedure"} (${detail})`
          : `Surgery: ${s.procedureName ?? "procedure"}`
      );
    }
  }
  if (historyParts.length) {
    chunks.push({
      chunk_type: "medicalHistory",
      chunk_text: `${prefix(date, title, "Medical history")}: ${historyParts.join("; ")}`,
    });
  }

  // Vitals
  if (payload?.vitals?.length) {
    const vitalLines = payload.vitals.map(formatVital);
    chunks.push({
      chunk_type: "vitals",
      chunk_text: `${prefix(date, title, "Vitals")}: ${vitalLines.join("; ")}`,
    });
  }

  // Treatment plan
  const planParts: string[] = [];
  if (payload?.treatmentPlan?.goals?.length) {
    planParts.push(`Goals: ${payload.treatmentPlan.goals.join("; ")}`);
  }
  if (payload?.treatmentPlan?.interventions?.length) {
    for (const i of payload.treatmentPlan.interventions) {
      const detail = [i.category, i.details, i.status].filter(Boolean).join(", ");
      planParts.push(
        detail
          ? `${i.description ?? "Intervention"} (${detail})`
          : (i.description ?? "Intervention")
      );
    }
  }
  if (planParts.length) {
    chunks.push({
      chunk_type: "treatmentPlan",
      chunk_text: `${prefix(date, title, "Treatment plan")}: ${planParts.join(". ")}`,
    });
  }

  // Physical exam (optional section often present in payload)
  if (payload?.physicalExamination) {
    const peEntries = Object.entries(payload.physicalExamination).filter(
      ([, v]) => typeof v === "string" && v.trim()
    );
    if (peEntries.length) {
      chunks.push({
        chunk_type: "physicalExamination",
        chunk_text: `${prefix(date, title, "Physical examination")}: ${peEntries
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ")}`,
      });
    }
  }

  // Fallback so empty-ish records still get at least one searchable chunk
  if (chunks.length === 0) {
    chunks.push({
      chunk_type: "encounter_meta",
      chunk_text: `${prefix(date, title, "Encounter")}: No structured clinical details recorded.`,
    });
  }

  return chunks;
}
