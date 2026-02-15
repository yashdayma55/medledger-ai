"use client";

import { useState, useRef, useEffect } from "react";
import { getHistorySummary, sendChatMessage } from "./chat-action";
import type { Encounter } from "@/lib/types/doctor-history";

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/** Build plain-text context from encounters for the LLM. */
export function buildContextFromEncounters(encounters: Encounter[]): string {
  const blocks: string[] = [];
  for (const enc of encounters) {
    const lines: string[] = [
      `## ${enc.title} (${formatDate(enc.date)})`,
      enc.summary ? `Summary: ${enc.summary}` : "",
      enc.complaint ? `Chief complaint: ${enc.complaint}` : "",
      enc.diagnosis ? `Diagnosis/notes: ${enc.diagnosis}` : "",
    ].filter(Boolean);

    const eventParts: string[] = [];
    for (const ev of enc.events) {
      if (ev.type === "labs" && ev.summary)
        eventParts.push(`  Vitals: ${ev.summary}${ev.abnormal ? " [abnormal]" : ""}`);
      if (ev.type === "medications" && ev.label)
        eventParts.push(`  Medication: ${ev.label}${ev.summary ? ` — ${ev.summary}` : ""}`);
      if (ev.type === "conditions" && ev.label)
        eventParts.push(`  Condition: ${ev.label}${ev.severity ? ` — ${ev.severity}` : ""}`);
      if (ev.type === "notes" && (ev.summary || ev.label))
        eventParts.push(`  Note: ${ev.summary ?? ev.label}`);
    }
    if (eventParts.length) lines.push(eventParts.join("\n"));
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

type Message = { role: "user" | "assistant"; content: string };

export function HistoryChatPanel({
  contextText,
  patientName,
  onClose,
}: {
  contextText: string;
  patientName: string | null;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleGetSummary = async () => {
    if (!contextText.trim()) {
      setError("No history loaded. Select a patient first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { text, error: err } = await getHistorySummary(contextText, patientName);
      if (err) {
        setError(err);
        return;
      }
      if (text) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "Give me a quick summary of this patient." },
          { role: "assistant", content: text },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    if (!contextText.trim()) {
      setError("No history loaded. Select a patient first.");
      return;
    }
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const { text, error: err } = await sendChatMessage(
        contextText,
        patientName,
        messages,
        trimmed
      );
      if (err) {
        setError(err);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      if (text) {
        setMessages((prev) => [...prev, { role: "assistant", content: text }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const hasContext = contextText.length > 0;

  return (
    <div className="flex flex-col h-full bg-medledger-slate border-l border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h3 className="text-white font-semibold text-sm">AI Summary &amp; Chat</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!hasContext && (
          <p className="text-slate-500 text-sm">
            Select a patient and load history, then use &quot;Get quick summary&quot; or ask a
            question below.
          </p>
        )}
        {hasContext && messages.length === 0 && !loading && (
          <p className="text-slate-400 text-sm">
            Click &quot;Get quick summary&quot; for a bullet-point summary, or type a question
            below.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "text-right"
                : "rounded-lg bg-medledger-slate-light border border-slate-600 p-3 text-slate-200 text-sm whitespace-pre-wrap"
            }
          >
            {m.role === "user" ? (
              <span className="inline-block rounded-lg bg-teal-500/20 px-3 py-2 text-sm text-teal-100 max-w-[85%]">
                {m.content}
              </span>
            ) : (
              m.content
            )}
          </div>
        ))}
        {loading && (
          <div className="rounded-lg bg-medledger-slate-light border border-slate-600 p-3 text-slate-400 text-sm">
            Thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 py-2 text-red-300 text-xs border-t border-slate-700">{error}</div>
      )}

      <div className="p-4 border-t border-slate-700 space-y-2">
        {messages.length === 0 && (
          <button
            type="button"
            onClick={handleGetSummary}
            disabled={!hasContext || loading}
            className="w-full rounded-lg bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:pointer-events-none text-white font-medium py-2 text-sm"
          >
            Get quick summary
          </button>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about this patient..."
            className="flex-1 rounded-lg border border-slate-600 bg-medledger-slate text-white px-3 py-2 text-sm placeholder-slate-500 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            disabled={!hasContext || loading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !hasContext || loading}
            className="rounded-lg bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:pointer-events-none text-white px-4 py-2 text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
