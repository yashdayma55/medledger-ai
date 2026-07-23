import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import type { EmbeddingModel } from "ai";

/** Target dimension for `record_chunks.embedding vector(1536)`. */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Embedding provider selection (mirrors chat `getModel()`, with a stricter OpenAI preference):
 *
 * OpenAI `text-embedding-3-small` is 1536-dim; Gemini `text-embedding-004` is 768-dim.
 * To keep a single `vector(1536)` column, we ALWAYS use OpenAI for embeddings when
 * `OPENAI_API_KEY` is set — even if chat generation later falls back to Gemini.
 * Only when there is no OpenAI key at all do we use Gemini (`gemini-embedding-001`
 * with `outputDimensionality: 1536`) so vectors still fit the schema.
 */
export function getEmbeddingModel(): EmbeddingModel | null {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return openai.embedding("text-embedding-3-small");
  }

  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!geminiKey) return null;

  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  return google.embedding("gemini-embedding-001");
}

function isGeminiEmbedding(): boolean {
  return !process.env.OPENAI_API_KEY?.trim();
}

type EmbedTask = "document" | "query";

function geminiProviderOptions(task: EmbedTask = "document") {
  return {
    google: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType:
        task === "query"
          ? ("RETRIEVAL_QUERY" as const)
          : ("RETRIEVAL_DOCUMENT" as const),
    },
  };
}

/** Embed a single string into a 1536-dim vector. */
export async function embedText(
  text: string,
  opts?: { task?: EmbedTask }
): Promise<number[]> {
  const model = getEmbeddingModel();
  if (!model) {
    throw new Error(
      "No embedding API key set. Add OPENAI_API_KEY (preferred) or GEMINI_API_KEY."
    );
  }

  const task = opts?.task ?? "query";
  const { embedding } = await embed({
    model,
    value: text,
    ...(isGeminiEmbedding() ? { providerOptions: geminiProviderOptions(task) } : {}),
  });

  return normalizeEmbedding(embedding);
}

/** Batch-embed many strings (for indexing). */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const model = getEmbeddingModel();
  if (!model) {
    throw new Error(
      "No embedding API key set. Add OPENAI_API_KEY (preferred) or GEMINI_API_KEY."
    );
  }

  const { embeddings } = await embedMany({
    model,
    values: texts,
    ...(isGeminiEmbedding()
      ? { providerOptions: geminiProviderOptions("document") }
      : {}),
  });

  return embeddings.map(normalizeEmbedding);
}

/** Ensure vector length matches `vector(1536)` (pad/truncate if a provider drifts). */
function normalizeEmbedding(embedding: number[]): number[] {
  if (embedding.length === EMBEDDING_DIMENSIONS) return embedding;
  if (embedding.length > EMBEDDING_DIMENSIONS) {
    return embedding.slice(0, EMBEDDING_DIMENSIONS);
  }
  return [...embedding, ...Array(EMBEDDING_DIMENSIONS - embedding.length).fill(0)];
}
