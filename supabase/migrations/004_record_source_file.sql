-- Add optional source file reference for EHR uploads
ALTER TABLE patient_medical_records
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confidence_score SMALLINT;
