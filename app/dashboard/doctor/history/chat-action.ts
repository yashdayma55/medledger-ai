"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getSession } from "@/lib/auth/session";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";

function getModel() {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) return openai("gpt-4o-mini");
  const geminiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!geminiKey) return null;
  const google = createGoogleGenerativeAI({ apiKey: geminiKey });
  return google("gemini-2.0-flash");
}

const SYSTEM_PROMPT = `You are a concise medical assistant for doctors. Use only the patient history context provided. Summarize clearly in bullet points when asked. Answer follow-up questions briefly and clinically. If the context does not contain enough information, say so. Do not make up data. When possible, cite the record date(s) and section(s) your answer is grounded in (e.g. "as of [2024-10-30] Medications").`;

const SUMMARY_RETRIEVAL_QUERY =
  "overall clinical summary, key problems, current medications, red flags";

function buildContextBlock(
  chunks: { chunk_text: string; chunk_type: string }[]
): string {
  if (chunks.length === 0) return "";
  return chunks
    .map((c, i) => `[${i + 1}] (${c.chunk_type})\n${c.chunk_text}`)
    .join("\n\n");
}

function groundingNote(
  chunks: { chunk_text: string; chunk_type: string }[]
): string {
  if (chunks.length === 0) return "";
  const sources = chunks.map((c) => {
    const dateMatch = c.chunk_text.match(/^\[([^\]]+)\]/);
    const date = dateMatch?.[1] ?? "unknown date";
    return `${date} / ${c.chunk_type}`;
  });
  const unique = Array.from(new Set(sources));
  return `\n\nSources consulted: ${unique.join("; ")}.`;
}

/** Generate a quick summary via RAG retrieval for the selected patient. */
export async function getHistorySummary(
  patientUserId: string,
  patientName: string | null
): Promise<{ text: string; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { text: "", error: "Unauthorized" };
  }

  if (!patientUserId.trim()) {
    return {
      text: "",
      error: "No patient selected. Select a patient and wait for history to load.",
    };
  }

  const model = getModel();
  if (!model) {
    return {
      text: "",
      error: "No API key set. Add OPENAI_API_KEY or GEMINI_API_KEY in .env.local for AI summary.",
    };
  }

  let chunks: { chunk_text: string; chunk_type: string }[];
  try {
    chunks = await retrieveRelevantChunks(patientUserId, SUMMARY_RETRIEVAL_QUERY);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 200) };
  }

  if (chunks.length === 0) {
    return {
      text: "",
      error: "No indexed history found for this patient. Save or backfill embeddings first.",
    };
  }

  const contextText = buildContextBlock(chunks);
  const patientLabel = patientName ? `Patient: ${patientName}.` : "Patient name unknown.";
  const prompt = `${patientLabel}\n\nBelow are the most relevant excerpts from the patient's records (each prefixed with record date and section). Provide a short clinical summary in bullet points for the doctor: key problems, current meds, notable findings, and any red flags. Cite dates/sections where helpful.\n\n---\n${contextText}\n---`;

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      maxRetries: 1,
    });
    return { text: (text.trim() + groundingNote(chunks)).trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 200) };
  }
}

/** One follow-up turn: retrieve chunks for the user question, then generate. */
export async function sendChatMessage(
  patientUserId: string,
  patientName: string | null,
  messages: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<{ text: string; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { text: "", error: "Unauthorized" };
  }

  if (!patientUserId.trim()) {
    return {
      text: "",
      error: "No patient selected. Select a patient first.",
    };
  }

  const model = getModel();
  if (!model) {
    return { text: "", error: "No API key set. Add OPENAI_API_KEY or GEMINI_API_KEY in .env.local." };
  }

  let chunks: { chunk_text: string; chunk_type: string }[];
  try {
    chunks = await retrieveRelevantChunks(patientUserId, userMessage);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 200) };
  }

  const patientLabel = patientName ? `Patient: ${patientName}.` : "Patient name unknown.";
  const contextText = buildContextBlock(chunks);
  const contextBlock = contextText
    ? `\n[Patient history — retrieved excerpts]\n${contextText}\n[/history]\n\nUse only the above excerpts to answer. Cite record dates/sections when possible.`
    : "\n[No matching history excerpts found for this question.]\n";

  const fullMessages = [
    { role: "user" as const, content: `${patientLabel}${contextBlock}` },
    ...messages,
    { role: "user" as const, content: userMessage },
  ].filter((m) => m.content.trim());

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: fullMessages,
      maxRetries: 1,
    });
    const grounded =
      chunks.length > 0 ? (text.trim() + groundingNote(chunks)).trim() : text.trim();
    return { text: grounded };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 200) };
  }
}
