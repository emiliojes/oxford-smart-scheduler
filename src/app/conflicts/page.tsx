"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Printer, RefreshCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface DetectedConflict {
  teacherId: string;
  teacherName: string;
  day: number;
  dayName: string;
  assignment1: { id: string; grade: string; subject: string; startTime: string; endTime: string; };
  assignment2: { id: string; grade: string; subject: string; startTime: string; endTime: string; };
}

interface StoredConflict {
  id: string;
  status: string;
  subject: { name: string };
  grade: { name: string; section: string | null } | null;
  teacher: { name: string };
  timeBlock: { dayOfWeek: number; startTime: string; endTime: string };
  conflicts: { id: string; conflictType: string; description: string; severity: string }[];
}

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const LEVEL_LABELS: Record<string, string> = { all: "All Levels", secondary: "Middle & High (6–12)", primary: "Primary (K–5)" };

export default function ConflictsPage() {
  const [detected, setDetected] = useState<DetectedConflict[]>([]);
  const [stored, setStored] = useState<StoredConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<"all" | "secondary" | "primary">("all");
  const [resolving, setResolving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [detRes, storedRes] = await Promise.all([
        fetch(`/api/conflicts?level=${levelFilter}`),
        fetch(`/api/assignments?status=CONFLICT`),
      ]);
      const detData = await detRes.json();
      const storedData = await storedRes.json();
      setDetected(detData.conflicts || []);
      setStored((storedData || []).filter((a: any) => a.status === "CONFLICT"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resolveAssignment = async (id: string) => {
    setResolving(id);
    try {
      await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve" }),
      });
      fetchAll();
    } finally {
      setResolving(null);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      fetchAll();
    } finally {
      setDeleting(null);
    }
  };

  const byTeacher = detected.reduce((acc, c) => {
    if (!acc[c.teacherName]) acc[c.teacherName] = [];
    acc[c.teacherName].push(c);
    return acc;
  }, {} as Record<string, DetectedConflict[]>);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-card { break-inside: avoid; border: 1px solid #ccc; margin-bottom: 12px; padding: 10px; }
          body { background: white; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="text-red-500 w-6 h-6" />
              Schedule Conflicts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Detected overlaps and stored conflict records
            </p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={fetchAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-slate-200 rounded-lg text-white dark:text-slate-900 font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 no-print flex-wrap">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Level:</span>
          {(["all", "secondary", "primary"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                levelFilter === l
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-blue-400"
              }`}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Detected Overlaps</div>
            <div className="text-3xl font-bold text-red-700 dark:text-red-300">{detected.length}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Stored Conflicts</div>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stored.length}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-500 font-medium mb-1">Teachers Affected</div>
            <div className="text-3xl font-bold text-slate-700 dark:text-slate-200">{Object.keys(byTeacher).length}</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading conflicts…</div>
        ) : (
          <>
            {/* ── STORED CONFLICTS ── */}
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                Stored Conflict Records
                <span className="text-sm font-normal text-slate-500">({stored.length})</span>
              </h2>
              {stored.length === 0 ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 flex items-center gap-3">
                  <CheckCircle2 className="text-green-600 w-5 h-5 shrink-0" />
                  <span className="text-green-700 dark:text-green-300 font-medium">No stored conflicts — all assignments are confirmed.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {stored.map(a => {
                    const grade = a.grade ? `${a.grade.name}${a.grade.section ?? ""}` : "—";
                    const day = DAY_NAMES[a.timeBlock.dayOfWeek] ?? `Day ${a.timeBlock.dayOfWeek}`;
                    const msgs = a.conflicts.map(c => c.description.split("(")[0].trim()).join(", ");
                    return (
                      <div key={a.id} className="print-card bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {grade} · {a.subject.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {a.teacher.name} · {day} {a.timeBlock.startTime}–{a.timeBlock.endTime}
                          </div>
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">{msgs}</div>
                        </div>
                        <div className="flex items-center gap-2 no-print shrink-0">
                          <button
                            disabled={resolving === a.id}
                            onClick={() => resolveAssignment(a.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {resolving === a.id ? "Resolving…" : "Resolve"}
                          </button>
                          <button
                            disabled={deleting === a.id}
                            onClick={() => deleteAssignment(a.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deleting === a.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── DETECTED OVERLAPS ── */}
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                Detected Scheduling Overlaps
                <span className="text-sm font-normal text-slate-500">({detected.length})</span>
              </h2>
              {detected.length === 0 ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 flex items-center gap-3">
                  <CheckCircle2 className="text-green-600 w-5 h-5 shrink-0" />
                  <span className="text-green-700 dark:text-green-300 font-medium">No overlaps detected for this level.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byTeacher).map(([teacher, list]) => (
                    <div key={teacher} className="print-card bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
                      <button
                        className="no-print w-full flex items-center justify-between px-5 py-3 bg-red-50 dark:bg-red-950/40 text-left hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors"
                        onClick={() => setExpandedTeacher(expandedTeacher === teacher ? null : teacher)}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-semibold text-red-900 dark:text-red-200">{teacher}</span>
                          <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-0.5 rounded-full">
                            {list.length} conflict{list.length > 1 ? "s" : ""}
                          </span>
                        </div>
                        {expandedTeacher === teacher ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
                      </button>
                      {/* Print always shows content; screen only when expanded */}
                      <div className={expandedTeacher === teacher ? "" : "hidden print:block"}>
                        <div className="divide-y divide-red-100 dark:divide-red-900/30">
                          {list.map((c, i) => (
                            <div key={i} className="px-5 py-4">
                              <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">{c.dayName}</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[c.assignment1, c.assignment2].map((a, idx) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-700/40 rounded-lg p-3 flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">{a.startTime} – {a.endTime}</div>
                                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-0.5">{a.grade} · {a.subject}</div>
                                    </div>
                                    <button
                                      className="no-print shrink-0 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-500 transition-colors"
                                      disabled={deleting === a.id}
                                      onClick={() => deleteAssignment(a.id)}
                                      title="Delete assignment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
