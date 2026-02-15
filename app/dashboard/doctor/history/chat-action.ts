"use server";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getSession } from "@/lib/auth/session";

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

const SYSTEM_PROMPT = `You are a concise medical assistant for doctors. Use only the patient history context provided. Summarize clearly in bullet points when asked. Answer follow-up questions briefly and clinically. If the context does not contain enough information, say so. Do not make up data.`;

/** Generate a quick summary of the patient history context for the doctor. */
export async function getHistorySummary(
  contextText: string,
  patientName: string | null
): Promise<{ text: string; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { text: "", error: "Unauthorized" };
  }

  const model = getModel();
  if (!model) {
    return {
      text: "",
      error: "No API key set. Add OPENAI_API_KEY or GEMINI_API_KEY in .env.local for AI summary.",
    };
  }

  if (!contextText.trim()) {
    return {
      text: "",
      error: "No patient history loaded. Select a patient and wait for history to load.",
    };
  }

  const patientLabel = patientName ? `Patient: ${patientName}.` : "Patient name unknown.";
  const prompt = `${patientLabel}\n\nBelow is the patient's record summary (encounters, vitals, medications, conditions, notes). Provide a short clinical summary in bullet points for the doctor: key problems, current meds, notable findings, and any red flags.\n\n---\n${contextText.slice(0, 30000)}\n---`;

  try {
    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      maxRetries: 1,
    });
    return { text: text.trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 200) };
  }
}

/** One follow-up turn: user message + prior conversation, with same context. */
export async function sendChatMessage(
  contextText: string,
  patientName: string | null,
  messages: { role: "user" | "assistant"; content: string }[],
  userMessage: string
): Promise<{ text: string; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== "provider") {
    return { text: "", error: "Unauthorized" };
  }

  const model = getModel();
  if (!model) {
    return { text: "", error: "No API key set. Add OPENAI_API_KEY or GEMINI_API_KEY in .env.local." };
  }

  const patientLabel = patientName ? `Patient: ${patientName}.` : "Patient name unknown.";
  const contextBlock = contextText.trim()
    ? `\n[Patient history]\n${contextText.slice(0, 25000)}\n[/history]\n\nUse the above to answer the doctor's questions.`
    : "";

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
    return { text: text.trim() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: "", error: message.slice(0, 200) };
  }
}
