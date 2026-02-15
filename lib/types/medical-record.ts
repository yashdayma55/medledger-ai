/** Shape for fhir_lite_json / record payload (matches provided schema) */
export type RecordPayload = {
  recordId?: string;
  extractedAt?: string;
  sourceFile?: string | null;
  confidenceScore?: number | null;
  patient?: {
    patientId?: string;
    mrn?: string;
    firstName?: string;
    middleInitial?: string;
    lastName?: string;
    fullName?: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
    contactInfo?: {
      phone?: string | null;
      email?: string | null;
      address?: { street?: string; city?: string; state?: string; zipCode?: string };
    };
  };
  admission?: {
    admissionId?: string;
    admissionNumber?: string;
    admissionDate?: string;
    dischargeDate?: string | null;
    lengthOfStay?: number;
    admissionType?: string;
    chiefComplaint?: string;
    dischargeDisposition?: string | null;
  };
  clinicalSummary?: {
    summary?: string;
    presentingIllness?: string;
    historyOfPresentIllness?: string;
  };
  medicalHistory?: {
    conditions?: Array<{ name?: string; icdCode?: string; status?: string; notes?: string }>;
    surgicalHistory?: Array<{ procedureName?: string; date?: string; outcome?: string }>;
    socialHistory?: Record<string, unknown>;
  };
  medications?: Array<{
    name?: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    status?: string;
    indication?: string;
  }>;
  vitals?: Array<{
    recordedAt?: string;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
  }>;
  physicalExamination?: Record<string, string>;
  treatmentPlan?: {
    interventions?: Array<{ category?: string; description?: string; details?: string; status?: string }>;
    goals?: string[];
  };
  metadata?: Record<string, unknown>;
};
