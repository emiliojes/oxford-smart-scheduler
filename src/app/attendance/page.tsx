"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckSquare, ChevronLeft, ChevronRight, Users, Loader2, FileText } from "lucide-react";
import Link from "next/link";

interface Grade { id: string; name: string; section: string | null; level: string; }
interface Student { id: string; firstName: string; lastName: string; gradeId: string; }
interface AttendanceRecord { studentId: string; status: string; note?: string | null; }

const STATUS_CODES = ["P", "UA", "EA", "UT", "FT", "DO"] as const;
type StatusCode = typeof STATUS_CODES[number];

const STATUS_META: Record<StatusCode, { label: string; color: string; bg: string; border: string }> = {
  P:  { label: "Present",         color: "text-green-700",  bg: "bg-green-100",  border: "border-green-400" },
  UA: { label: "Unexcused Absent", color: "text-red-700",    bg: "bg-red-100",    border: "border-red-400" },
  EA: { label: "Excused Absent",   color: "text-blue-700",   bg: "bg-blue-100",   border: "border-blue-400" },
  UT: { label: "Unexcused Tardy",  color: "text-amber-700",  bg: "bg-amber-100",  border: "border-amber-400" },
  FT: { label: "Field Trip",       color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-400" },
  DO: { label: "Day Off",          color: "text-slate-500",  bg: "bg-slate-100",  border: "border-slate-300" },
};

const LEVEL_ORDER = ["PRIMARY", "LOW_SECONDARY", "SECONDARY", "BOTH"];
const GRADE_ORDER = ["K","PK","1","2","3","4","5","6","7","8","9","10","11","12"];

function sortGrades(grades: Grade[]) {
  return [...grades].sort((a, b) => {
    const li = LEVEL_ORDER.indexOf(a.level), lj = LEVEL_ORDER.indexOf(b.level);
    if (li !== lj) return li - lj;
    const ni = GRADE_ORDER.indexOf(a.name), nj = GRADE_ORDER.indexOf(b.name);
    if (ni !== nj) return (ni === -1 ? 99 : ni) - (nj === -1 ? 99 : nj);
    return (a.section ?? "").localeCompare(b.section ?? "");
  });
}

function gradeLabel(g: Grade) {
  return `${g.name === "K" ? "Kinder" : "Grade " + g.name}${g.section ? " " + g.section : ""}`;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [date, setDate] = useState<string>(toDateStr(new Date()));
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, StatusCode>>({}); // studentId -> status
  const [notes, setNotes] = useState<Record<string, string>>({}); // studentId -> note
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const canManage = user?.role === "ADMIN" || user?.role === "COORDINATOR";

  useEffect(() => {
    if (!user) return;
    fetch("/api/grades").then(r => r.json()).then(g => setGrades(sortGrades(g))).catch(() => {});
  }, [user]);

  // Load students + existing attendance when grade/date changes
  useEffect(() => {
    if (!selectedGradeId) return;
    setLoadingStudents(true);
    Promise.all([
      fetch(`/api/students?gradeId=${selectedGradeId}`).then(r => r.json()),
      fetch(`/api/attendance?gradeId=${selectedGradeId}&date=${date}`).then(r => r.json()),
    ]).then(([studs, recs]: [Student[], AttendanceRecord[]]) => {
      setStudents(studs);
      const att: Record<string, StatusCode> = {};
      const nts: Record<string, string> = {};
      recs.forEach(r => {
        att[r.studentId] = r.status as StatusCode;
        if (r.note) nts[r.studentId] = r.note;
      });
      setAttendance(att);
      setNotes(nts);
    }).catch(() => toast.error("Error loading attendance"))
      .finally(() => setLoadingStudents(false));
  }, [selectedGradeId, date]);

  const setStatus = useCallback((studentId: string, status: StatusCode) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }, []);

  const markAll = (status: StatusCode) => {
    const all: Record<string, StatusCode> = {};
    students.forEach(s => { all[s.id] = status; });
    setAttendance(all);
  };

  const saveAll = async () => {
    if (!selectedGradeId || students.length === 0) return;
    setSaving(true);
    try {
      const records = students.map(s => ({
        studentId: s.id,
        status: attendance[s.id] ?? "P",
        note: notes[s.id] ?? null,
      }));
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: selectedGradeId, date, records, takenById: user?.username ?? "unknown" }),
      });
      if (res.ok) toast.success("Attendance saved");
      else toast.error("Error saving attendance");
    } catch { toast.error("Connection error"); }
    finally { setSaving(false); }
  };

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(toDateStr(d));
  };

  const selectedGrade = grades.find(g => g.id === selectedGradeId);

  const summary = students.reduce((acc, s) => {
    const st = attendance[s.id] ?? "—";
    acc[st] = (acc[st] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-green-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Attendance</h1>
        </div>
        <div className="flex items-center gap-2">
          {canManage && selectedGradeId && (
            <Link href={`/grades/${selectedGradeId}/students`}>
              <Button variant="outline" size="sm" className="gap-1">
                <Users className="w-4 h-4" /> Manage Students
              </Button>
            </Link>
          )}
          {canManage && (
            <Link href="/attendance/report">
              <Button variant="outline" size="sm" className="gap-1">
                <FileText className="w-4 h-4" /> Reports
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end bg-slate-50 dark:bg-slate-900 border rounded-lg px-4 py-3">
        {/* Grade selector */}
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Grade</label>
          <select
            className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white"
            value={selectedGradeId}
            onChange={e => setSelectedGradeId(e.target.value)}
          >
            <option value="">— Select grade —</option>
            {grades.map(g => (
              <option key={g.id} value={g.id}>{gradeLabel(g)}</option>
            ))}
          </select>
        </div>

        {/* Date navigator */}
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Date</label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => changeDate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 dark:text-white h-8"
            />
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => changeDate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDate(toDateStr(new Date()))}>
              Today
            </Button>
          </div>
        </div>

        {/* Mark all shortcuts */}
        {students.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Mark all as</label>
            <div className="flex gap-1">
              {(["P", "DO"] as StatusCode[]).map(s => (
                <button
                  key={s}
                  onClick={() => markAll(s)}
                  className={`px-2 py-1 rounded text-xs font-bold border ${STATUS_META[s].bg} ${STATUS_META[s].color} ${STATUS_META[s].border}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary badges */}
      {students.length > 0 && Object.keys(attendance).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_CODES.map(s => {
            const count = summary[s] ?? 0;
            if (count === 0) return null;
            return (
              <span key={s} className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_META[s].bg} ${STATUS_META[s].color} ${STATUS_META[s].border}`}>
                {s}: {count}
              </span>
            );
          })}
          {summary["—"] > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200">
              Not set: {summary["—"]}
            </span>
          )}
        </div>
      )}

      {/* Student list */}
      {!selectedGradeId ? (
        <div className="text-center py-20 text-slate-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Select a grade to take attendance</p>
        </div>
      ) : loadingStudents ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : students.length === 0 ? (
        <div className="text-center py-16 text-slate-400 space-y-2">
          <Users className="w-12 h-12 mx-auto opacity-30" />
          <p className="font-medium">No students in {selectedGrade ? gradeLabel(selectedGrade) : "this grade"}</p>
          {canManage && (
            <Link href={`/grades/${selectedGradeId}/students`}>
              <Button size="sm" className="mt-2">Add students</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="px-4 py-2 text-left font-semibold">#</th>
                  <th className="px-4 py-2 text-left font-semibold">Student</th>
                  {STATUS_CODES.map(s => (
                    <th key={s} className="px-2 py-2 text-center font-bold w-12 text-xs">{s}</th>
                  ))}
                  <th className="px-3 py-2 text-left font-semibold text-xs">Note</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const current = attendance[student.id];
                  return (
                    <tr key={student.id} className={`border-t ${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}`}>
                      <td className="px-4 py-2 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                        {student.lastName}, {student.firstName}
                      </td>
                      {STATUS_CODES.map(s => {
                        const meta = STATUS_META[s];
                        const active = current === s;
                        return (
                          <td key={s} className="px-1 py-1.5 text-center">
                            <button
                              onClick={() => setStatus(student.id, s)}
                              className={`w-9 h-7 rounded text-xs font-bold border transition-all ${
                                active
                                  ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm scale-105`
                                  : "bg-white dark:bg-slate-800 text-slate-300 border-slate-200 hover:border-slate-400 hover:text-slate-600"
                              }`}
                              title={meta.label}
                            >
                              {s}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          placeholder="—"
                          value={notes[student.id] ?? ""}
                          onChange={e => setNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                          className="w-full text-xs px-2 py-1 border rounded bg-transparent dark:text-white placeholder:text-slate-300"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={saveAll} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Attendance — {selectedGrade ? gradeLabel(selectedGrade) : ""} · {date}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
