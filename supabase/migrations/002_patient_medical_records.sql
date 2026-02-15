-- =========================================
-- PATIENT MEDICAL RECORDS (view-only for patient dashboard)
-- =========================================
CREATE TABLE IF NOT EXISTS patient_medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  record_date DATE NOT NULL,
  summary TEXT,
  fhir_lite_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_medical_records_patient
  ON patient_medical_records(patient_user_id, record_date DESC);
