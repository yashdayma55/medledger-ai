-- Run this in Supabase Dashboard → SQL Editor if patient_medical_records is missing
-- Requires: public.users table (id UUID) already exists

-- 1. Create the table (from 002_patient_medical_records.sql)
CREATE TABLE IF NOT EXISTS public.patient_medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  record_date DATE NOT NULL,
  summary TEXT,
  fhir_lite_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_medical_records_patient
  ON public.patient_medical_records(patient_user_id, record_date DESC);

-- 2. Add optional columns (from 004_record_source_file.sql)
ALTER TABLE public.patient_medical_records
  ADD COLUMN IF NOT EXISTS source_file TEXT,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confidence_score SMALLINT;
