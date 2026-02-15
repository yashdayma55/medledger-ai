"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import type { RecordPayload } from "@/lib/types/medical-record";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStr(form: FormData, key: string): string {
  return (form.get(key) as string)?.trim() ?? "";
}
function getNum(form: FormData, key: string): number | null {
  const v = form.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function saveMedicalRecord(formData: FormData): Promise<never> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    redirect("/auth/login/doctor");
  }
  if (!supabaseAdmin) {
    redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Server configuration error."));
  }
  const db = supabaseAdmin;

  const patientMode = (formData.get("patient_mode") as string) || "new";
  let patientUserId: string;

  if (patientMode === "existing") {
    const email = getStr(formData, "existing_patient_email").toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Please enter a valid patient email."));
    }
    const { data: user } = await db
      .from("users")
      .select("id")
      .eq("email", email)
      .eq("role", "patient")
      .maybeSingle();
    if (!user) {
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("No patient found with this email. Create a new patient or use a registered email."));
    }
    patientUserId = user.id;
  } else {
    const email = getStr(formData, "new_patient_email").toLowerCase();
    const password = formData.get("new_patient_password") as string;
    const fullName = getStr(formData, "full_name");
    const dob = getStr(formData, "dob") || null;
    const sexAtBirth = getStr(formData, "sex_at_birth") || null;
    const preferredLanguage = getStr(formData, "preferred_language") || null;

    if (!email || !EMAIL_REGEX.test(email)) {
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Please enter a valid email for the new patient."));
    }
    if (!password || password.length < 8) {
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Password must be at least 8 characters."));
    }
    if (!fullName || fullName.length < 2) {
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Full name is required (at least 2 characters)."));
    }

    const { data: existing } = await db.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("A user with this email already exists. Use “Existing patient” and enter this email to link the record."));
    }

    const passwordHash = await hashPassword(password);
    const { data: user, error: userError } = await db
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        role: "patient",
        status: "active",
      })
      .select("id")
      .single();

    if (userError || !user) {
      console.error("User insert error:", userError);
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Failed to create patient account. Please try again."));
    }
    patientUserId = user.id;

    const { error: profileError } = await db.from("patient_profile").insert({
      user_id: patientUserId,
      full_name: fullName,
      dob: dob || null,
      sex_at_birth: sexAtBirth || null,
      preferred_language: preferredLanguage || null,
    });
    if (profileError) {
      console.error("Patient profile insert error:", profileError);
      await db.from("users").delete().eq("id", patientUserId);
      redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent("Failed to create patient profile. Please try again."));
    }
  }

  const title = getStr(formData, "title") || "Medical record";
  const recordDateStr = getStr(formData, "record_date");
  const recordDate = recordDateStr || new Date().toISOString().slice(0, 10);
  const summary = getStr(formData, "summary") || null;

  const payload: RecordPayload = {
    sourceFile: (formData.get("ehr_file") as File)?.name || getStr(formData, "source_file") || null,
    patient: {
      firstName: getStr(formData, "patient_first_name"),
      middleInitial: getStr(formData, "patient_middle_initial") || undefined,
      lastName: getStr(formData, "patient_last_name"),
      fullName: [getStr(formData, "patient_first_name"), getStr(formData, "patient_middle_initial"), getStr(formData, "patient_last_name")].filter(Boolean).join(" ").trim() || undefined,
      dateOfBirth: getStr(formData, "patient_dob") || undefined,
      gender: getStr(formData, "patient_gender") || undefined,
      contactInfo: {
        phone: getStr(formData, "patient_phone") || null,
        email: getStr(formData, "patient_contact_email") || null,
        address: {
          street: getStr(formData, "patient_street") || undefined,
          city: getStr(formData, "patient_city") || undefined,
          state: getStr(formData, "patient_state") || undefined,
          zipCode: getStr(formData, "patient_zip") || undefined,
        },
      },
    },
    admission: {
      admissionDate: getStr(formData, "admission_date") || undefined,
      dischargeDate: getStr(formData, "discharge_date") || undefined,
      admissionType: getStr(formData, "admission_type") || undefined,
      chiefComplaint: getStr(formData, "chief_complaint") || undefined,
      dischargeDisposition: getStr(formData, "discharge_disposition") || null,
    },
    clinicalSummary: {
      summary: getStr(formData, "clinical_summary"),
      presentingIllness: getStr(formData, "presenting_illness"),
      historyOfPresentIllness: getStr(formData, "history_of_present_illness"),
    },
    medicalHistory: parseMedicalHistory(formData),
    medications: parseMedications(formData),
    vitals: parseVitals(formData),
    physicalExamination: parsePhysicalExam(formData),
    treatmentPlan: parseTreatmentPlan(formData),
    metadata: { extractionMethod: "Manual entry", extractionVersion: "1.0" },
  };

  let sourceFile: string | null = null;
  const ehrFile = formData.get("ehr_file") as File | null;
  if (ehrFile && ehrFile.size > 0) {
    sourceFile = ehrFile.name;
    try {
      const bucket = "ehr-files";
      const path = `${session.sub}/${Date.now()}-${ehrFile.name}`;
      const { error: uploadError } = await db.storage.from(bucket).upload(path, ehrFile, { upsert: false });
      if (!uploadError) {
        const { data: urlData } = db.storage.from(bucket).getPublicUrl(path);
        sourceFile = urlData?.publicUrl ?? ehrFile.name;
      }
    } catch {
      sourceFile = ehrFile.name;
    }
  }

  const { error: insertError } = await db.from("patient_medical_records").insert({
    patient_user_id: patientUserId,
    provider_user_id: session.sub,
    title,
    record_date: recordDate,
    summary,
    fhir_lite_json: payload as unknown as Record<string, unknown>,
    source_file: sourceFile,
    extracted_at: new Date().toISOString(),
    confidence_score: getNum(formData, "confidence_score"),
  });

  if (insertError) {
    console.error("Record insert error:", insertError);
    const message =
      insertError.message?.includes("column")
        ? "Database schema may be outdated. Run Supabase migrations (e.g. 004_record_source_file.sql)."
        : insertError.message?.slice(0, 200) || "Failed to save record.";
    redirect("/dashboard/doctor/records/new?error=" + encodeURIComponent(message));
  }

  redirect("/dashboard/doctor?success=record_created");
}

function parseMedicalHistory(form: FormData): RecordPayload["medicalHistory"] {
  const conditionsRaw = getStr(form, "conditions_json");
  const surgicalRaw = getStr(form, "surgical_history_json");
  type MedicalHistory = NonNullable<RecordPayload["medicalHistory"]>;
  let conditions: MedicalHistory["conditions"];
  let surgicalHistory: MedicalHistory["surgicalHistory"];
  try {
    if (conditionsRaw) conditions = JSON.parse(conditionsRaw) as MedicalHistory["conditions"];
  } catch {
    conditions = undefined;
  }
  try {
    if (surgicalRaw) surgicalHistory = JSON.parse(surgicalRaw) as MedicalHistory["surgicalHistory"];
  } catch {
    surgicalHistory = undefined;
  }
  return { conditions, surgicalHistory };
}

function parseMedications(form: FormData): RecordPayload["medications"] {
  const raw = getStr(form, "medications_json");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as RecordPayload["medications"];
  } catch {
    return undefined;
  }
}

function parseVitals(form: FormData): RecordPayload["vitals"] {
  const sys = getNum(form, "vital_bp_systolic");
  const dia = getNum(form, "vital_bp_diastolic");
  const hr = getNum(form, "vital_heart_rate");
  const temp = getNum(form, "vital_temperature");
  const o2 = getNum(form, "vital_oxygen_saturation");
  const weight = getNum(form, "vital_weight");
  const height = getNum(form, "vital_height");
  if (sys == null && dia == null && hr == null && temp == null && o2 == null && weight == null && height == null) {
    return undefined;
  }
  return [
    {
      bloodPressureSystolic: sys ?? undefined,
      bloodPressureDiastolic: dia ?? undefined,
      heartRate: hr ?? undefined,
      temperature: temp ?? undefined,
      oxygenSaturation: o2 ?? undefined,
      weight: weight ?? undefined,
      height: height ?? undefined,
      recordedAt: new Date().toISOString(),
    },
  ];
}

function parsePhysicalExam(form: FormData): RecordPayload["physicalExamination"] {
  const general = getStr(form, "pe_general");
  const cardiovascular = getStr(form, "pe_cardiovascular");
  const respiratory = getStr(form, "pe_respiratory");
  const musculoskeletal = getStr(form, "pe_musculoskeletal");
  const neurological = getStr(form, "pe_neurological");
  if (!general && !cardiovascular && !respiratory && !musculoskeletal && !neurological) return undefined;
  const out: Record<string, string> = {};
  if (general) out.general = general;
  if (cardiovascular) out.cardiovascular = cardiovascular;
  if (respiratory) out.respiratory = respiratory;
  if (musculoskeletal) out.musculoskeletal = musculoskeletal;
  if (neurological) out.neurological = neurological;
  return out;
}

function parseTreatmentPlan(form: FormData): RecordPayload["treatmentPlan"] {
  const goalsRaw = getStr(form, "treatment_goals");
  const interventionsRaw = getStr(form, "treatment_interventions_json");
  const goals = goalsRaw ? goalsRaw.split("\n").map((s) => s.trim()).filter(Boolean) : undefined;
  type TreatmentPlan = NonNullable<RecordPayload["treatmentPlan"]>;
  let interventions: TreatmentPlan["interventions"];
  try {
    if (interventionsRaw) interventions = JSON.parse(interventionsRaw) as TreatmentPlan["interventions"];
  } catch {
    interventions = undefined;
  }
  return { goals, interventions };
}
