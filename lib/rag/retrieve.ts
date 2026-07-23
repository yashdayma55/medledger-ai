import { supabaseAdmin } from "@/lib/supabase/server";
import { embedText } from "./embed";

export type RetrievedChunk = {
  chunk_text: string;
  chunk_type: string;
  similarity?: number;
};

/**
 * Embed the query and retrieve the top-K most relevant chunks for one patient.
 */
export async function retrieveRelevantChunks(
  patientUserId: string,
  query: string,
  matchCount = Number(process.env.RAG_MATCH_COUNT) || 8
): Promise<RetrievedChunk[]> {
  if (!supabaseAdmin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const queryEmbedding = await embedText(query, { task: "query" });

  const { data, error } = await supabaseAdmin.rpc("match_record_chunks", {
    query_embedding: queryEmbedding,
    match_patient_id: patientUserId,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`Chunk retrieval failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    chunk_text: string;
    chunk_type: string;
    similarity?: number;
  }>;

  return rows.map((row) => ({
    chunk_text: row.chunk_text,
    chunk_type: row.chunk_type,
    similarity: row.similarity,
  }));
}
