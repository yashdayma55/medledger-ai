-- =========================================
-- RAG: pgvector embeddings for medical record chunks
-- =========================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS record_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID NOT NULL REFERENCES patient_medical_records(id) ON DELETE CASCADE,
  patient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_chunks_record_id
  ON record_chunks(record_id);

CREATE INDEX IF NOT EXISTS idx_record_chunks_patient_user_id
  ON record_chunks(patient_user_id);

-- IVFFlat cosine-similarity index for ANN retrieval
CREATE INDEX IF NOT EXISTS idx_record_chunks_embedding
  ON record_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Retrieve top-K chunks for a patient by cosine distance to the query embedding
CREATE OR REPLACE FUNCTION match_record_chunks(
  query_embedding vector(1536),
  match_patient_id uuid,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  record_id uuid,
  patient_user_id uuid,
  chunk_type text,
  chunk_text text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    rc.id,
    rc.record_id,
    rc.patient_user_id,
    rc.chunk_type,
    rc.chunk_text,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM record_chunks rc
  WHERE rc.patient_user_id = match_patient_id
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
$$;
