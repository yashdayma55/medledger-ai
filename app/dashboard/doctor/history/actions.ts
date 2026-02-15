"use server";

import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { PatientOption, PatientHistoryResult } from "@/lib/types/doctor-history";
import type { RecordPayload } from "@/lib/types/medical-record";
import { recordToEncounter } from "@/lib/doctor-history/normalize";

const LOG_PREFIX = "[DoctorHistory]";

/** Get list of patients that have records linked to the current provider. */
export async function getDoctorPatients(): Promise<{
  patients: PatientOption[];
  queryLog: string[];
  error?: string;
}> {
  const queryLog: string[] = [];
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { patients: [], queryLog, error: "Unauthorized" };
  }
  if (!supabaseAdmin) {
    return { patients: [], queryLog, error: "Server configuration error" };
  }
  const db = supabaseAdmin;
  const providerId = session.sub;

  try {
    queryLog.push(`${LOG_PREFIX} table=patient_medical_records intent=distinct patients for provider`);
    const { data: rows, error: recordsError } = await db
      .from("patient_medical_records")
      .select("patient_user_id")
      .eq("provider_user_id", providerId);

    if (recordsError) {
      queryLog.push(`${LOG_PREFIX} error=${recordsError.message}`);
      return { patients: [], queryLog, error: recordsError.message };
    }

    const patientIds = Array.from(new Set((rows ?? []).map((r) => r.patient_user_id as string)));
    if (patientIds.length === 0) {
      return { patients: [], queryLog };
    }

    const countByPatient: Record<string, number> = {};
    for (const r of rows ?? []) {
      const id = r.patient_user_id as string;
      countByPatient[id] = (countByPatient[id] ?? 0) + 1;
    }

    queryLog.push(`${LOG_PREFIX} table=patient_profile intent=patient names`);
    const { data: profiles } = await db
      .from("patient_profile")
      .select("user_id, full_name")
      .in("user_id", patientIds);

    queryLog.push(`${LOG_PREFIX} table=users intent=patient emails`);
    const { data: users } = await db
      .from("users")
      .select("id, email")
      .in("id", patientIds);

    const profileByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const userById = new Map((users ?? []).map((u) => [u.id, u]));

    const patients: PatientOption[] = patientIds.map((patient_user_id) => {
      const p = profileByUserId.get(patient_user_id);
      const u = userById.get(patient_user_id);
      return {
        patient_user_id,
        full_name: p?.full_name ?? null,
        email: u?.email ?? null,
        record_count: countByPatient[patient_user_id] ?? 0,
      };
    });

    return { patients, queryLog };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    queryLog.push(`${LOG_PREFIX} throw=${message}`);
    return { patients: [], queryLog, error: message };
  }
}

export type DateRangeFilter = "30d" | "6mo" | "all";

/** Get full history for a patient: encounters built from patient_medical_records + fhir_lite_json. */
export async function getPatientHistory(
  patientUserId: string,
  dateRange: DateRangeFilter
): Promise<PatientHistoryResult> {
  const queryLog: string[] = [];
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { encounters: [], patientName: null, queryLog, error: "Unauthorized" };
  }
  if (!supabaseAdmin) {
    return { encounters: [], patientName: null, queryLog, error: "Server configuration error" };
  }
  const db = supabaseAdmin;

  try {
    let fromDate: string | null = null;
    if (dateRange === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      fromDate = d.toISOString().slice(0, 10);
      queryLog.push(`${LOG_PREFIX} dateFilter=last 30 days from=${fromDate}`);
    } else if (dateRange === "6mo") {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      fromDate = d.toISOString().slice(0, 10);
      queryLog.push(`${LOG_PREFIX} dateFilter=last 6 months from=${fromDate}`);
    } else {
      queryLog.push(`${LOG_PREFIX} dateFilter=all`);
    }

    queryLog.push(`${LOG_PREFIX} table=patient_medical_records intent=history for patient`);
    let q = db
      .from("patient_medical_records")
      .select("id, patient_user_id, title, record_date, summary, fhir_lite_json, source_file, confidence_score")
      .eq("patient_user_id", patientUserId)
      .order("record_date", { ascending: false });

    if (fromDate) {
      q = q.gte("record_date", fromDate);
    }

    const { data: rows, error: recordsError } = await q;

    if (recordsError) {
      queryLog.push(`${LOG_PREFIX} error=${recordsError.message}`);
      return { encounters: [], patientName: null, queryLog, error: recordsError.message };
    }

    queryLog.push(`${LOG_PREFIX} table=patient_profile intent=patient name`);
    const { data: profile } = await db
      .from("patient_profile")
      .select("full_name")
      .eq("user_id", patientUserId)
      .single();

    const patientName = profile?.full_name ?? null;

    const encounters = (rows ?? []).map((row) => {
      const payload = (row.fhir_lite_json as RecordPayload | null) ?? null;
      return recordToEncounter(
        row.id,
        row.record_date,
        row.title,
        row.summary,
        row.source_file,
        row.confidence_score,
        payload
      );
    });

    return { encounters, patientName, queryLog };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    queryLog.push(`${LOG_PREFIX} throw=${message}`);
    return { encounters: [], patientName: null, queryLog, error: message };
  }
}
