"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDoctorPatients,
  getPatientHistory,
  type DateRangeFilter,
} from "./actions";
import {
  HistoryChatPanel,
  buildContextFromEncounters,
} from "./HistoryChatPanel";
import type {
  Encounter,
  HistoryEventType,
  PatientOption,
  TimelineEvent,
} from "@/lib/types/doctor-history";

const EVENT_TYPES: { value: HistoryEventType; label: string }[] = [
  { value: "encounter", label: "Encounter" },
  { value: "labs", label: "Labs" },
  { value: "medications", label: "Medications" },
  { value: "allergies", label: "Allergies" },
  { value: "conditions", label: "Conditions" },
  { value: "notes", label: "Notes" },
  { value: "documents", label: "Documents" },
];

const DATE_RANGES: { value: DateRangeFilter; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "6mo", label: "Last 6 months" },
  { value: "all", label: "All" },
];

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

function eventMatchesSearch(ev: TimelineEvent, search: string): boolean {
  if (!search.trim()) return true;
  const s = search.toLowerCase();
  return (
    ev.label.toLowerCase().includes(s) ||
    (ev.summary ?? "").toLowerCase().includes(s) ||
    (ev.severity ?? "").toLowerCase().includes(s)
  );
}

function filterEncounters(
  encounters: Encounter[],
  eventTypeFilter: HistoryEventType | "all",
  onlyAbnormal: boolean,
  search: string
): Encounter[] {
  return encounters
    .map((enc) => {
      let events = enc.events;
      if (eventTypeFilter !== "all") {
        events = events.filter((e) => e.type === eventTypeFilter);
      }
      if (onlyAbnormal) {
        events = events.filter((e) => e.abnormal === true);
      }
      if (search.trim()) {
        events = events.filter((e) => eventMatchesSearch(e, search));
      }
      return { ...enc, events };
    })
    .filter((enc) => enc.events.length > 0);
}

export function HistoryView() {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientsLog, setPatientsLog] = useState<string[]>([]);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<HistoryEventType | "all">("all");
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [search, setSearch] = useState("");

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [patientName, setPatientName] = useState<string | null>(null);
  const [historyLog, setHistoryLog] = useState<string[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [expandedEncounterIds, setExpandedEncounterIds] = useState<Set<string>>(new Set());
  const [showDebug, setShowDebug] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPatientsLoading(true);
      setPatientsError(null);
      const { patients: p, queryLog, error } = await getDoctorPatients();
      if (cancelled) return;
      setPatients(p);
      setPatientsLog(queryLog);
      setPatientsError(error ?? null);
      setPatientsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHistory = useCallback(async (patientId: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    const result = await getPatientHistory(patientId, dateRange);
    setEncounters(result.encounters);
    setPatientName(result.patientName);
    setHistoryLog(result.queryLog);
    setHistoryError(result.error ?? null);
    setHistoryLoading(false);
    setSelectedEncounterId(null);
    if (result.encounters.length > 0) {
      setExpandedEncounterIds(new Set([result.encounters[0]!.id]));
    } else {
      setExpandedEncounterIds(new Set());
    }
  }, [dateRange]);

  useEffect(() => {
    if (!selectedPatientId) {
      setEncounters([]);
      setPatientName(null);
      setHistoryLog([]);
      setHistoryError(null);
      return;
    }
    loadHistory(selectedPatientId);
  }, [selectedPatientId, loadHistory]);

  const filteredEncounters = useMemo(
    () => filterEncounters(encounters, eventTypeFilter, onlyAbnormal, search),
    [encounters, eventTypeFilter, onlyAbnormal, search]
  );

  const selectedEncounter = useMemo(
    () => (selectedEncounterId ? encounters.find((e) => e.id === selectedEncounterId) : null),
    [encounters, selectedEncounterId]
  );

  const toggleExpanded = (encId: string) => {
    setExpandedEncounterIds((prev) => {
      const next = new Set(prev);
      if (next.has(encId)) next.delete(encId);
      else next.add(encId);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar: patient + filters */}
      <div className="border-b border-slate-700 bg-medledger-slate-light px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-sm whitespace-nowrap">Patient</label>
          <select
            value={selectedPatientId ?? ""}
            onChange={(e) => setSelectedPatientId(e.target.value || null)}
            disabled={patientsLoading}
            className="rounded-lg border border-slate-600 bg-medledger-slate text-white px-3 py-2 text-sm min-w-[200px] focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p.patient_user_id} value={p.patient_user_id}>
                {p.full_name || p.email || p.patient_user_id} ({p.record_count} records)
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-sm whitespace-nowrap">Date range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
            disabled={!selectedPatientId || historyLoading}
            className="rounded-lg border border-slate-600 bg-medledger-slate text-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-slate-400 text-sm whitespace-nowrap">Event type</label>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter((e.target.value || "all") as HistoryEventType | "all")}
            className="rounded-lg border border-slate-600 bg-medledger-slate text-white px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={onlyAbnormal}
            onChange={(e) => setOnlyAbnormal(e.target.checked)}
            className="rounded border-slate-500 text-teal-500 focus:ring-teal-500"
          />
          Only abnormal
        </label>
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-600 bg-medledger-slate text-white px-3 py-2 text-sm w-48 placeholder-slate-500 focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={() => setShowChatPanel((s) => !s)}
          className="rounded-lg bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 text-sm font-medium"
        >
          {showChatPanel ? "Hide" : "AI Summary"} chat
        </button>
        <button
          type="button"
          onClick={() => setShowDebug((s) => !s)}
          className="text-slate-500 hover:text-slate-300 text-xs"
        >
          {showDebug ? "Hide" : "Show"} query log
        </button>
      </div>

      {patientsError && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-200 text-sm">
          Failed to load patients: {patientsError}
        </div>
      )}

      {/* Main content: timeline (left) + detail (right) [+ chat when open] */}
      <div className="flex-1 flex min-h-0">
        {/* Left: timeline */}
        <div className="w-[380px] shrink-0 border-r border-slate-700 flex flex-col overflow-hidden bg-medledger-slate">
          <div className="px-3 py-2 border-b border-slate-700 text-slate-400 text-sm font-medium">
            Timeline
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!selectedPatientId && (
              <p className="text-slate-500 text-sm py-8 text-center">
                Select a patient to view history.
              </p>
            )}
            {selectedPatientId && historyLoading && (
              <p className="text-slate-400 text-sm py-8 text-center">Loading history…</p>
            )}
            {selectedPatientId && !historyLoading && historyError && (
              <p className="text-red-300 text-sm py-4">Error: {historyError}</p>
            )}
            {selectedPatientId && !historyLoading && !historyError && filteredEncounters.length === 0 && (
              <p className="text-slate-500 text-sm py-8 text-center">
                No history available for the selected filters.
              </p>
            )}
            {selectedPatientId &&
              !historyLoading &&
              !historyError &&
              filteredEncounters.length > 0 &&
              filteredEncounters.map((enc) => {
                const isExpanded = expandedEncounterIds.has(enc.id);
                const isSelected = selectedEncounterId === enc.id;
                return (
                  <div
                    key={enc.id}
                    className="rounded-lg border border-slate-600 overflow-hidden bg-medledger-slate-light"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        toggleExpanded(enc.id);
                        setSelectedEncounterId(enc.id);
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700/50"
                    >
                      <span className="text-slate-400 text-xs font-mono">
                        {formatDate(enc.date)}
                      </span>
                      <span className="flex-1 truncate text-white font-medium text-sm">
                        {enc.title}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-600">
                        {enc.events.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => setSelectedEncounterId(enc.id)}
                            className="w-full text-left px-4 py-2 flex items-start gap-2 hover:bg-slate-700/50 border-b border-slate-700/50 last:border-0"
                          >
                            <span className="text-slate-500 text-xs shrink-0 mt-0.5">
                              {formatDate(ev.date)}
                            </span>
                            <span className="text-amber-400/90 text-xs shrink-0 uppercase">
                              {ev.type}
                            </span>
                            {ev.abnormal && (
                              <span className="shrink-0 rounded bg-amber-500/20 text-amber-300 text-xs px-1.5">
                                Abnormal
                              </span>
                            )}
                            <span className="flex-1 min-w-0 text-slate-300 text-sm truncate">
                              {ev.label}
                              {ev.summary ? ` — ${ev.summary}` : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-medledger-slate-light overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-700 text-slate-400 text-sm font-medium">
            Detail
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!selectedEncounter && (
              <p className="text-slate-500 text-sm">
                Select an encounter from the timeline to view details.
              </p>
            )}
            {selectedEncounter && (
              <DetailPanel encounter={selectedEncounter} patientName={patientName} />
            )}
          </div>
        </div>

        {/* AI Summary chat panel (optional) */}
        {showChatPanel && (
          <div className="w-[380px] shrink-0 flex flex-col min-h-0">
            <HistoryChatPanel
              contextText={buildContextFromEncounters(encounters)}
              patientName={patientName}
              onClose={() => setShowChatPanel(false)}
            />
          </div>
        )}
      </div>

      {/* Debug: query log */}
      {showDebug && (
        <div className="border-t border-slate-700 bg-slate-900/80 px-4 py-2 text-xs text-slate-400 font-mono max-h-32 overflow-y-auto">
          <div className="font-semibold text-slate-500 mb-1">Query log</div>
          {[...patientsLog, ...historyLog].map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailPanel({
  encounter,
}: {
  encounter: Encounter;
  patientName: string | null;
}) {
  const labs = encounter.events.filter((e) => e.type === "labs");
  const meds = encounter.events.filter((e) => e.type === "medications");
  const conditions = encounter.events.filter((e) => e.type === "conditions");
  const notes = encounter.events.filter((e) => e.type === "notes");
  const documents = encounter.events.filter((e) => e.type === "documents");
  const clinicalSummary = encounter.payload?.clinicalSummary;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-white font-semibold mb-2">Encounter overview</h3>
        <div className="rounded-lg border border-slate-600 bg-medledger-slate p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Date</span>
            <p className="text-white">{formatDate(encounter.date)}</p>
          </div>
          <div>
            <span className="text-slate-500">Title</span>
            <p className="text-white">{encounter.title}</p>
          </div>
          {encounter.facility && (
            <div>
              <span className="text-slate-500">Facility</span>
              <p className="text-white">{encounter.facility}</p>
            </div>
          )}
          {encounter.clinician && (
            <div>
              <span className="text-slate-500">Clinician</span>
              <p className="text-white">{encounter.clinician}</p>
            </div>
          )}
          {encounter.complaint && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">Chief complaint</span>
              <p className="text-white">{encounter.complaint}</p>
            </div>
          )}
          {encounter.diagnosis && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">Diagnosis / summary</span>
              <p className="text-white">{encounter.diagnosis}</p>
            </div>
          )}
          {encounter.sourceFile && (
            <div>
              <span className="text-slate-500">Source file</span>
              <p className="text-slate-300 truncate">{encounter.sourceFile}</p>
            </div>
          )}
          {encounter.confidenceScore != null && (
            <div>
              <span className="text-slate-500">Confidence</span>
              <p className="text-white">{Math.round(encounter.confidenceScore * 100)}%</p>
            </div>
          )}
        </div>
      </section>

      {labs.length > 0 && (
        <section>
          <h3 className="text-white font-semibold mb-2">Labs / observations</h3>
          <div className="rounded-lg border border-slate-600 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-medledger-slate text-slate-400 text-left">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {labs.map((ev) => {
                  const v = ev.payload as {
                    recordedAt?: string;
                    bloodPressureSystolic?: number;
                    bloodPressureDiastolic?: number;
                    heartRate?: number;
                    temperature?: number;
                    oxygenSaturation?: number;
                    weight?: number;
                    height?: number;
                  } | undefined;
                  const parts: string[] = [];
                  if (v?.bloodPressureSystolic != null && v?.bloodPressureDiastolic != null)
                    parts.push(`BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}`);
                  if (v?.heartRate != null) parts.push(`HR ${v.heartRate}`);
                  if (v?.temperature != null) parts.push(`Temp ${v.temperature}°C`);
                  if (v?.oxygenSaturation != null) parts.push(`SpO2 ${v.oxygenSaturation}%`);
                  if (v?.weight != null) parts.push(`Wt ${v.weight} kg`);
                  if (v?.height != null) parts.push(`Ht ${v.height} cm`);
                  const value = parts.length ? parts.join(", ") : ev.summary ?? "—";
                  return (
                    <tr
                      key={ev.id}
                      className="border-t border-slate-600 text-slate-300 hover:bg-slate-700/30"
                    >
                      <td className="px-3 py-2">{v?.recordedAt ? formatDate(v.recordedAt) : formatDate(ev.date)}</td>
                      <td className="px-3 py-2">
                        {value}
                        {ev.abnormal && (
                          <span className="ml-2 rounded bg-amber-500/20 text-amber-300 text-xs px-1.5">
                            Abnormal
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500">—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(meds.length > 0 || conditions.length > 0) && (
        <section>
          <h3 className="text-white font-semibold mb-2">Medications & conditions</h3>
          <div className="rounded-lg border border-slate-600 bg-medledger-slate p-4 space-y-3 text-sm">
            {meds.map((ev) => {
              const m = ev.payload as { name?: string; dosage?: string; frequency?: string; status?: string } | undefined;
              return (
                <div key={ev.id} className="flex items-baseline gap-2">
                  <span className="rounded bg-teal-500/20 text-teal-300 text-xs px-1.5">Added</span>
                  <span className="text-white">{m?.name ?? ev.label}</span>
                  {(m?.dosage || m?.frequency) && (
                    <span className="text-slate-400">— {[m.dosage, m.frequency].filter(Boolean).join(" ")}</span>
                  )}
                </div>
              );
            })}
            {conditions.map((ev) => (
              <div key={ev.id} className="flex items-baseline gap-2">
                <span className="rounded bg-slate-500/30 text-slate-300 text-xs px-1.5">Condition</span>
                <span className="text-white">{ev.label}</span>
                {ev.severity && <span className="text-slate-400">— {ev.severity}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {notes.length > 0 && (
        <section>
          <h3 className="text-white font-semibold mb-2">Notes</h3>
          <div className="rounded-lg border border-slate-600 bg-medledger-slate p-4 text-sm text-slate-300 whitespace-pre-wrap">
            {notes.map((ev) => (
              <div key={ev.id} className="mb-2 last:mb-0">
                {ev.summary ?? ev.label}
              </div>
            ))}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section>
          <h3 className="text-white font-semibold mb-2">Documents</h3>
          <div className="rounded-lg border border-slate-600 bg-medledger-slate p-4 space-y-2">
            {documents.map((ev) => {
              const doc = ev.payload as { url?: string; name?: string } | undefined;
              const name = doc?.name ?? doc?.url ?? ev.summary ?? "Document";
              return (
                <div key={ev.id} className="flex items-center gap-2">
                  <span className="text-slate-300 text-sm truncate flex-1">{name}</span>
                  <a
                    href={doc?.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 text-sm underline shrink-0"
                  >
                    Open
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-slate-400 font-semibold mb-2 text-sm uppercase tracking-wide">
          Prototype output
        </h3>
        <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 rounded-lg border border-slate-600 bg-medledger-slate p-4">
          {clinicalSummary?.summary && <li>{clinicalSummary.summary}</li>}
          {clinicalSummary?.presentingIllness && <li>Presenting: {clinicalSummary.presentingIllness}</li>}
          {clinicalSummary?.historyOfPresentIllness && (
            <li>HPI: {clinicalSummary.historyOfPresentIllness}</li>
          )}
          {encounter.summary && <li>{encounter.summary}</li>}
          {!clinicalSummary?.summary && !clinicalSummary?.presentingIllness && !clinicalSummary?.historyOfPresentIllness && !encounter.summary && (
            <li className="text-slate-500">No AI summary available for this encounter.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
