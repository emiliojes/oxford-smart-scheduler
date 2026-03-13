"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Loader2, Printer, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Grade { id: string; name: string; section: string | null; level: string; }
interface Student { id: string; firstName: string; lastName: string; }
interface ReportData {
  students: Student[];
  dates: string[];
  matrix: Record<string, Record<string, string>>;
  totals: Array<{ studentId: string; P: number; DO: number; UA: number; EA: number; UT: number; FT: number; totalDays: number; attendancePct: number | null }>;
}

const STATUS_COLORS: Record<string, string> = {
  P:  "bg-green-100 text-green-700",
  UA: "bg-red-100 text-red-700",
  EA: "bg-blue-100 text-blue-700",
  UT: "bg-amber-100 text-amber-700",
  FT: "bg-purple-100 text-purple-700",
  DO: "bg-slate-100 text-slate-400",
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

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function AttendanceReportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return toDateStr(d);
  });
  const [to, setTo] = useState(toDateStr(new Date()));
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "ADMIN" && user.role !== "COORDINATOR") { router.replace("/attendance"); return; }
    fetch("/api/grades").then(r => r.json()).then(g => setGrades(sortGrades(g))).catch(() => {});
  }, [user]);

  const loadReport = async () => {
    if (!selectedGradeId) { toast.error("Select a grade"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/report?gradeId=${selectedGradeId}&from=${from}&to=${to}`);
      const data = await res.json();
      if (res.ok) setReport(data);
      else toast.error(data.error ?? "Error loading report");
    } catch { toast.error("Connection error"); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!report) return;
    const selectedGrade = grades.find(g => g.id === selectedGradeId);
    const header = ["Student", ...report.dates, "P", "UA", "EA", "UT", "FT", "DO", "Attendance%"].join(",");
    const rows = report.students.map(s => {
      const tot = report.totals.find(t => t.studentId === s.id);
      const dayCells = report.dates.map(d => report.matrix[s.id]?.[d] ?? "");
      return [`"${s.lastName}, ${s.firstName}"`, ...dayCells, tot?.P ?? 0, tot?.UA ?? 0, tot?.EA ?? 0, tot?.UT ?? 0, tot?.FT ?? 0, tot?.DO ?? 0, tot?.attendancePct != null ? tot.attendancePct + "%" : ""].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `attendance_${selectedGrade ? gradeLabel(selectedGrade).replace(/\s/g,"_") : "report"}_${from}_${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const selectedGrade = grades.find(g => g.id === selectedGradeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <div className="flex items-center gap-2">
          <Link href="/attendance"><Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <FileText className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Attendance Report</h1>
        </div>
        <div className="flex gap-2">
          {report && <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>Export CSV</Button>}
          {report && <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</Button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end bg-slate-50 dark:bg-slate-900 border rounded-lg px-4 py-3 no-print">
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">Grade</label>
          <select className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white"
            value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)}>
            <option value="">— Select —</option>
            {grades.map(g => <option key={g.id} value={g.id}>{gradeLabel(g)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-500 font-medium">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white" />
        </div>
        <Button onClick={loadReport} disabled={loading} className="gap-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Generate
        </Button>
      </div>

      {/* Print header */}
      {report && (
        <div className="hidden print:block mb-3 border-2 border-slate-700">
          <table className="w-full" style={{borderCollapse:'collapse'}}>
            <tbody><tr>
              <td className="p-1 text-center align-middle border border-slate-400" style={{width:'52px'}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Oxford" style={{width:'42px',height:'auto',margin:'0 auto'}} />
              </td>
              <td className="text-center align-middle py-1 border border-slate-400">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">ATTENDANCE REPORT</div>
                <div className="text-sm font-bold uppercase">
                  {selectedGrade ? gradeLabel(selectedGrade) : ""} · {from} → {to}
                </div>
              </td>
            </tr></tbody>
          </table>
        </div>
      )}

      {/* Report table */}
      {report && report.students.length === 0 && (
        <div className="text-center py-12 text-slate-400">No students or records found for this period.</div>
      )}

      {report && report.students.length > 0 && (
        <div className="overflow-x-auto rounded-lg border shadow-sm">
          <table className="border-collapse text-xs" style={{minWidth: `${Math.max(600, report.dates.length * 42 + 300)}px`}}>
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2 text-left font-semibold sticky left-0 bg-slate-800 min-w-[160px]">Student</th>
                {report.dates.map(d => (
                  <th key={d} className="px-1 py-2 text-center font-medium min-w-[38px]">
                    <div>{new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className="font-bold">{d.slice(5)}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center bg-green-800 min-w-[32px]" title="Present">P</th>
                <th className="px-2 py-2 text-center bg-red-800 min-w-[32px]" title="Unexcused Absent">UA</th>
                <th className="px-2 py-2 text-center bg-blue-800 min-w-[32px]" title="Excused Absent">EA</th>
                <th className="px-2 py-2 text-center bg-amber-700 min-w-[32px]" title="Unexcused Tardy">UT</th>
                <th className="px-2 py-2 text-center bg-purple-800 min-w-[32px]" title="Field Trip">FT</th>
                <th className="px-2 py-2 text-center bg-slate-600 min-w-[32px]" title="Day Off">DO</th>
                <th className="px-2 py-2 text-center bg-slate-700 min-w-[48px]">Att%</th>
              </tr>
            </thead>
            <tbody>
              {report.students.map((s, idx) => {
                const tot = report.totals.find(t => t.studentId === s.id);
                const pct = tot?.attendancePct;
                return (
                  <tr key={s.id} className={`border-t ${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}`}>
                    <td className="px-3 py-1.5 font-medium sticky left-0 bg-inherit border-r">
                      {s.lastName}, {s.firstName}
                    </td>
                    {report.dates.map(d => {
                      const st = report.matrix[s.id]?.[d];
                      return (
                        <td key={d} className="px-0.5 py-1 text-center border-r border-slate-100">
                          {st ? (
                            <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[st] ?? "bg-slate-100 text-slate-500"}`}>
                              {st}
                            </span>
                          ) : (
                            <span className="text-slate-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center font-bold text-green-700">{tot?.P ?? 0}</td>
                    <td className="px-2 py-1 text-center font-bold text-red-600">{tot?.UA ?? 0}</td>
                    <td className="px-2 py-1 text-center font-bold text-blue-600">{tot?.EA ?? 0}</td>
                    <td className="px-2 py-1 text-center font-bold text-amber-600">{tot?.UT ?? 0}</td>
                    <td className="px-2 py-1 text-center font-bold text-purple-600">{tot?.FT ?? 0}</td>
                    <td className="px-2 py-1 text-center text-slate-400">{tot?.DO ?? 0}</td>
                    <td className={`px-2 py-1 text-center font-bold ${
                      pct == null ? "text-slate-300" :
                      pct >= 90 ? "text-green-600" : pct >= 75 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {pct != null ? `${pct}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 8mm; }
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          header, footer, nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
