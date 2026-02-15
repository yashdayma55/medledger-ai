"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { saveMedicalRecord } from "./actions";
import { parsePdfForRecord, type RecordPrefill } from "./parse-pdf-action";

const CONDITIONS_JSON_EXAMPLE = `[
  {"name": "Hypertension", "icdCode": "I10", "status": "Active", "notes": "Controlled"},
  {"name": "Type 2 Diabetes", "icdCode": "E11.9", "status": "Active", "notes": ""}
]`;

const MEDICATIONS_JSON_EXAMPLE = `[
  {"name": "Amlodipine", "dosage": "10mg", "route": "PO", "frequency": "Once daily", "indication": "Hypertension"},
  {"name": "Metformin", "dosage": "500mg", "route": "PO", "frequency": "Twice daily", "indication": "Diabetes"}
]`;

const INTERVENTIONS_JSON_EXAMPLE = `[
  {"category": "Medication", "description": "Pain management", "details": "Ibuprofen 400mg TID", "status": "Active"},
  {"category": "Therapy", "description": "Physical therapy", "details": "PT 2x/week", "status": "Pending"}
]`;

function applyPrefill(form: HTMLFormElement, data: RecordPrefill) {
  for (const [name, value] of Object.entries(data)) {
    if (value === undefined || value === "") continue;
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el && "value" in el) el.value = value;
  }
}

export function NewRecordForm({ errorFromUrl }: { errorFromUrl?: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [patientMode, setPatientMode] = useState<"existing" | "new">("new");
  const [isPending, setIsPending] = useState(false);
  const [parsePending, setParsePending] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleParsePdf() {
    const form = formRef.current;
    if (!form) return;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="pdf_file"]');
    const file = fileInput?.files?.[0];
    if (!file) {
      setParseError("Please select a PDF file.");
      return;
    }
    setParseError(null);
    setParsePending(true);
    try {
      const formData = new FormData();
      formData.set("pdf_file", file);
      const result = await parsePdfForRecord(formData);
      if (result.success) {
        applyPrefill(form, result.data);
        setParseError(null);
        fileInput.value = "";
      } else {
        setParseError(result.error);
      }
    } finally {
      setParsePending(false);
    }
  }

  return (
    <form ref={formRef} action={saveMedicalRecord} onSubmit={() => setIsPending(true)} className="space-y-10">
      {/* Parse from PDF */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Parse from PDF</h2>
        <p className="text-slate-400 text-sm">Upload a medical record PDF to auto-fill the form. You can edit any field before saving.</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px]">
            <label htmlFor="pdf_file" className="block text-sm font-medium text-slate-300 mb-1">PDF file</label>
            <input id="pdf_file" name="pdf_file" type="file" accept=".pdf,application/pdf" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white file:mr-4 file:rounded file:border-0 file:bg-teal-500 file:px-4 file:py-2 file:text-white file:text-sm" />
          </div>
          <button type="button" onClick={handleParsePdf} disabled={parsePending} className="rounded-xl bg-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 disabled:pointer-events-none">
            {parsePending ? "Parsing…" : "Parse PDF"}
          </button>
        </div>
        {parseError && <p className="text-red-400 text-sm" role="alert">{parseError}</p>}
      </section>

      {/* Patient section */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Patient</h2>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="radio"
              name="patient_mode"
              value="new"
              checked={patientMode === "new"}
              onChange={() => setPatientMode("new")}
              className="rounded border-slate-500 text-teal-500 focus:ring-teal-500"
            />
            New patient (create account)
          </label>
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="radio"
              name="patient_mode"
              value="existing"
              checked={patientMode === "existing"}
              onChange={() => setPatientMode("existing")}
              className="rounded border-slate-500 text-teal-500 focus:ring-teal-500"
            />
            Existing patient (link by email)
          </label>
        </div>

        {patientMode === "existing" && (
          <div>
            <label htmlFor="existing_patient_email" className="block text-sm font-medium text-slate-300 mb-1">
              Patient email
            </label>
            <input
              id="existing_patient_email"
              name="existing_patient_email"
              type="email"
              className="w-full max-w-md rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              placeholder="patient@example.com"
            />
          </div>
        )}

        {patientMode === "new" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="new_patient_email" className="block text-sm font-medium text-slate-300 mb-1">Email *</label>
              <input id="new_patient_email" name="new_patient_email" type="email" required={patientMode === "new"} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="patient@example.com" />
            </div>
            <div>
              <label htmlFor="new_patient_password" className="block text-sm font-medium text-slate-300 mb-1">Password (min 8) *</label>
              <input id="new_patient_password" name="new_patient_password" type="password" minLength={8} required={patientMode === "new"} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="••••••••" />
            </div>
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-1">Full name *</label>
              <input id="full_name" name="full_name" type="text" required={patientMode === "new"} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Jane Doe" />
            </div>
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-300 mb-1">Date of birth</label>
              <input id="dob" name="dob" type="date" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
            <div>
              <label htmlFor="sex_at_birth" className="block text-sm font-medium text-slate-300 mb-1">Sex at birth</label>
              <select id="sex_at_birth" name="sex_at_birth" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="preferred_language" className="block text-sm font-medium text-slate-300 mb-1">Preferred language</label>
              <input id="preferred_language" name="preferred_language" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="e.g. English" />
            </div>
          </div>
        )}
      </section>

      {/* Record basics */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Record basics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input id="title" name="title" type="text" defaultValue="Medical record" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="e.g. Admission note" />
          </div>
          <div>
            <label htmlFor="record_date" className="block text-sm font-medium text-slate-300 mb-1">Record date</label>
            <input id="record_date" name="record_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-slate-300 mb-1">Summary (optional)</label>
          <textarea id="summary" name="summary" rows={3} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Brief summary of the encounter" />
        </div>
      </section>

      {/* Patient demographics (for record) */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Patient demographics (for this record)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="patient_first_name" className="block text-sm font-medium text-slate-300 mb-1">First name</label>
            <input id="patient_first_name" name="patient_first_name" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Stephen" />
          </div>
          <div>
            <label htmlFor="patient_middle_initial" className="block text-sm font-medium text-slate-300 mb-1">Middle initial</label>
            <input id="patient_middle_initial" name="patient_middle_initial" type="text" maxLength={1} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="D" />
          </div>
          <div>
            <label htmlFor="patient_last_name" className="block text-sm font-medium text-slate-300 mb-1">Last name</label>
            <input id="patient_last_name" name="patient_last_name" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Porter" />
          </div>
          <div>
            <label htmlFor="patient_dob" className="block text-sm font-medium text-slate-300 mb-1">DOB</label>
            <input id="patient_dob" name="patient_dob" type="date" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="patient_gender" className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
            <select id="patient_gender" name="patient_gender" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500">
              <option value="">—</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="patient_phone" className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
            <input id="patient_phone" name="patient_phone" type="tel" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="+1..." />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="patient_contact_email" className="block text-sm font-medium text-slate-300 mb-1">Contact email</label>
            <input id="patient_contact_email" name="patient_contact_email" type="email" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="patient@example.com" />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="patient_street" className="block text-sm font-medium text-slate-300 mb-1">Address (street)</label>
            <input id="patient_street" name="patient_street" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="123 Main St" />
          </div>
          <div>
            <label htmlFor="patient_city" className="block text-sm font-medium text-slate-300 mb-1">City</label>
            <input id="patient_city" name="patient_city" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="patient_state" className="block text-sm font-medium text-slate-300 mb-1">State</label>
            <input id="patient_state" name="patient_state" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="patient_zip" className="block text-sm font-medium text-slate-300 mb-1">ZIP</label>
            <input id="patient_zip" name="patient_zip" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>
      </section>

      {/* Admission */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Admission</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="admission_date" className="block text-sm font-medium text-slate-300 mb-1">Admission date</label>
            <input id="admission_date" name="admission_date" type="date" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="discharge_date" className="block text-sm font-medium text-slate-300 mb-1">Discharge date</label>
            <input id="discharge_date" name="discharge_date" type="date" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="admission_type" className="block text-sm font-medium text-slate-300 mb-1">Admission type</label>
            <input id="admission_type" name="admission_type" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="e.g. Emergency, Elective" />
          </div>
          <div>
            <label htmlFor="discharge_disposition" className="block text-sm font-medium text-slate-300 mb-1">Discharge disposition</label>
            <input id="discharge_disposition" name="discharge_disposition" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="chief_complaint" className="block text-sm font-medium text-slate-300 mb-1">Chief complaint</label>
            <input id="chief_complaint" name="chief_complaint" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="e.g. Severe low back pain" />
          </div>
        </div>
      </section>

      {/* Clinical summary */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Clinical summary</h2>
        <div>
          <label htmlFor="clinical_summary" className="block text-sm font-medium text-slate-300 mb-1">Summary</label>
          <textarea id="clinical_summary" name="clinical_summary" rows={4} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Brief clinical summary..." />
        </div>
        <div>
          <label htmlFor="presenting_illness" className="block text-sm font-medium text-slate-300 mb-1">Presenting illness</label>
          <textarea id="presenting_illness" name="presenting_illness" rows={3} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        </div>
        <div>
          <label htmlFor="history_of_present_illness" className="block text-sm font-medium text-slate-300 mb-1">History of present illness</label>
          <textarea id="history_of_present_illness" name="history_of_present_illness" rows={4} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        </div>
      </section>

      {/* Medical history (JSON) */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Medical history (optional JSON)</h2>
        <div>
          <label htmlFor="conditions_json" className="block text-sm font-medium text-slate-300 mb-1">Conditions (JSON array)</label>
          <textarea id="conditions_json" name="conditions_json" rows={5} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono text-sm" placeholder={CONDITIONS_JSON_EXAMPLE} />
        </div>
        <div>
          <label htmlFor="surgical_history_json" className="block text-sm font-medium text-slate-300 mb-1">Surgical history (JSON array)</label>
          <textarea id="surgical_history_json" name="surgical_history_json" rows={4} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono text-sm" placeholder='[{"procedureName": "CABG", "date": "2018-02", "outcome": "Successful"}]' />
        </div>
      </section>

      {/* Medications (JSON) */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Medications (optional JSON)</h2>
        <div>
          <label htmlFor="medications_json" className="block text-sm font-medium text-slate-300 mb-1">Medications (JSON array)</label>
          <textarea id="medications_json" name="medications_json" rows={6} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono text-sm" placeholder={MEDICATIONS_JSON_EXAMPLE} />
        </div>
      </section>

      {/* Vitals */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Vitals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="vital_bp_systolic" className="block text-sm font-medium text-slate-300 mb-1">BP systolic</label>
            <input id="vital_bp_systolic" name="vital_bp_systolic" type="number" min={0} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="vital_bp_diastolic" className="block text-sm font-medium text-slate-300 mb-1">BP diastolic</label>
            <input id="vital_bp_diastolic" name="vital_bp_diastolic" type="number" min={0} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="vital_heart_rate" className="block text-sm font-medium text-slate-300 mb-1">Heart rate</label>
            <input id="vital_heart_rate" name="vital_heart_rate" type="number" min={0} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="vital_temperature" className="block text-sm font-medium text-slate-300 mb-1">Temp (°C)</label>
            <input id="vital_temperature" name="vital_temperature" type="number" step={0.1} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="vital_oxygen_saturation" className="block text-sm font-medium text-slate-300 mb-1">SpO2 %</label>
            <input id="vital_oxygen_saturation" name="vital_oxygen_saturation" type="number" min={0} max={100} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="vital_weight" className="block text-sm font-medium text-slate-300 mb-1">Weight (kg)</label>
            <input id="vital_weight" name="vital_weight" type="number" step={0.1} min={0} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="vital_height" className="block text-sm font-medium text-slate-300 mb-1">Height (cm)</label>
            <input id="vital_height" name="vital_height" type="number" step={0.1} min={0} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>
      </section>

      {/* Physical examination */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Physical examination</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="pe_general" className="block text-sm font-medium text-slate-300 mb-1">General</label>
            <textarea id="pe_general" name="pe_general" rows={2} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="pe_cardiovascular" className="block text-sm font-medium text-slate-300 mb-1">Cardiovascular</label>
            <input id="pe_cardiovascular" name="pe_cardiovascular" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="pe_respiratory" className="block text-sm font-medium text-slate-300 mb-1">Respiratory</label>
            <input id="pe_respiratory" name="pe_respiratory" type="text" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="pe_musculoskeletal" className="block text-sm font-medium text-slate-300 mb-1">Musculoskeletal</label>
            <textarea id="pe_musculoskeletal" name="pe_musculoskeletal" rows={2} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label htmlFor="pe_neurological" className="block text-sm font-medium text-slate-300 mb-1">Neurological</label>
            <textarea id="pe_neurological" name="pe_neurological" rows={2} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>
      </section>

      {/* Treatment plan */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">Treatment plan</h2>
        <div>
          <label htmlFor="treatment_goals" className="block text-sm font-medium text-slate-300 mb-1">Goals (one per line)</label>
          <textarea id="treatment_goals" name="treatment_goals" rows={3} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder={"Pain control\nImprove mobility"} />
        </div>
        <div>
          <label htmlFor="treatment_interventions_json" className="block text-sm font-medium text-slate-300 mb-1">Interventions (JSON array)</label>
          <textarea id="treatment_interventions_json" name="treatment_interventions_json" rows={5} className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono text-sm" placeholder={INTERVENTIONS_JSON_EXAMPLE} />
        </div>
      </section>

      {/* EHR file upload */}
      <section className="rounded-xl border border-slate-600 bg-medledger-slate-light p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-white">EHR file (optional)</h2>
        <p className="text-slate-400 text-sm">Upload an existing EHR document (PDF, etc.). Stored with the record.</p>
        <div>
          <label htmlFor="ehr_file" className="block text-sm font-medium text-slate-300 mb-1">File</label>
          <input id="ehr_file" name="ehr_file" type="file" accept=".pdf,.doc,.docx,image/*" className="w-full rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white file:mr-4 file:rounded file:border-0 file:bg-teal-500 file:px-4 file:py-2 file:text-white file:text-sm" />
        </div>
        <div>
          <label htmlFor="confidence_score" className="block text-sm font-medium text-slate-300 mb-1">Confidence score % (optional)</label>
          <input id="confidence_score" name="confidence_score" type="number" min={0} max={100} className="w-full max-w-[120px] rounded-lg border border-slate-600 bg-medledger-slate px-4 py-3 text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500" />
        </div>
      </section>

      {errorFromUrl && (
        <p className="text-red-400 text-sm" role="alert">
          {errorFromUrl}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-teal-500 px-6 py-3 font-semibold text-white hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? "Saving…" : "Save record"}
        </button>
        <Link href="/dashboard/doctor" className="text-slate-400 hover:text-white text-sm underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
