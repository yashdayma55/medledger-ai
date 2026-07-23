import { supabaseAdmin } from "@/lib/supabase/server";
import type { RecordPayload } from "@/lib/types/medical-record";
import { chunkRecord } from "./chunk";
import { embedTexts } from "./embed";

/**
 * Chunk + embed one patient_medical_records row and upsert into record_chunks.
 * Deletes existing chunks for the record first so re-indexing is idempotent.
 */
export async function indexMedicalRecord(recordId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }
  const db = supabaseAdmin;

  const { data: record, error: loadError } = await db
    .from("patient_medical_records")
    .select("id, patient_user_id, title, record_date, summary, fhir_lite_json")
    .eq("id", recordId)
    .maybeSingle();

  if (loadError) {
    throw new Error(`Failed to load record ${recordId}: ${loadError.message}`);
  }
  if (!record) {
    throw new Error(`Record not found: ${recordId}`);
  }

  const chunks = chunkRecord({
    id: record.id as string,
    record_date: record.record_date as string,
    title: record.title as string,
    summary: (record.summary as string | null) ?? null,
    fhir_lite_json: (record.fhir_lite_json as RecordPayload | null) ?? null,
  });

  const embeddings = await embedTexts(chunks.map((c) => c.chunk_text));

  const { error: deleteError } = await db
    .from("record_chunks")
    .delete()
    .eq("record_id", recordId);

  if (deleteError) {
    throw new Error(`Failed to clear old chunks for ${recordId}: ${deleteError.message}`);
  }

  const rows = chunks.map((chunk, i) => ({
    record_id: record.id as string,
    patient_user_id: record.patient_user_id as string,
    chunk_type: chunk.chunk_type,
    chunk_text: chunk.chunk_text,
    embedding: embeddings[i]!,
  }));

  const { error: insertError } = await db.from("record_chunks").insert(rows);
  if (insertError) {
    throw new Error(`Failed to insert chunks for ${recordId}: ${insertError.message}`);
  }
}
