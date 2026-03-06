"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, LayoutGrid, Users } from "lucide-react";

interface Grade { id: string; name: string; section: string | null; level: string; }
interface Teacher { id: string; name: string; level: string; }
interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { name: string };
  grade: { name: string; section: string | null } | null;
  room: { name: string } | null;
  timeBlock: { dayOfWeek: number; startTime: string; endTime: string; blockType: string; duration: string };
  status: string;
}
interface TimeBlock {
  id: string; dayOfWeek: number; startTime: string; endTime: string; blockType: string; level: string;
}

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
  return `${g.name === "K" ? "Kinder" : g.name}${g.section ?? ""}`;
}

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
const DAY_SHORT = ["Mon","Tue","Wed","Thu","Fri"];

// Subject color palette (compact)
const SUBJECT_COLORS: Record<string, string> = {};
const PALETTE = [
  "#dbeafe","#d1fae5","#ede9fe","#fef3c7","#ffe4e6","#cffafe",
  "#fed7aa","#d9f99d","#fce7f3","#e0e7ff","#ccfbf1","#fef9c3",
];
let _ci = 0;
function subjectColor(name: string): string {
  if (!SUBJECT_COLORS[name]) SUBJECT_COLORS[name] = PALETTE[_ci++ % PALETTE.length];
  return SUBJECT_COLORS[name];
}

type ViewMode = "grade" | "teacher";

export default function MasterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("grade");
  const [levelFilter, setLevelFilter] = useState<string>("PRIMARY");
  const [dayFilter, setDayFilter] = useState<number>(0); // 0 = all days
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "ADMIN" && user.role !== "COORDINATOR") {
      router.replace("/schedule");
      return;
    }
    setLoading(true);
    Promise.all([
      fetch("/api/grades").then(r => r.json()),
      fetch("/api/teachers").then(r => r.json()),
      fetch("/api/time-blocks").then(r => r.json()),
      fetch("/api/assignments").then(r => r.json()),
    ]).then(([g, tc, tb, as]) => {
      setGrades(sortGrades(g));
      setTeachers(tc);
      setTimeBlocks(tb);
      setAllAssignments(as);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  // Columns = grades or teachers filtered by level
  const levelLabel = (l: string) => {
    if (l === "PRIMARY") return t.teachers.levels.PRIMARY;
    if (l === "LOW_SECONDARY") return t.teachers.levels.LOW_SECONDARY;
    if (l === "SECONDARY") return t.teachers.levels.SECONDARY;
    return l;
  };

  const availableLevels = Array.from(new Set([
    ...grades.map(g => g.level),
    ...teachers.map(tc => tc.level),
  ])).filter(l => LEVEL_ORDER.includes(l)).sort((a,b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));

  const columns = viewMode === "grade"
    ? grades.filter(g => g.level === levelFilter || levelFilter === "ALL")
    : teachers.filter(tc => tc.level === levelFilter || levelFilter === "ALL").sort((a,b) => a.name.localeCompare(b.name));

  // Time blocks for level
  const tbLevel = levelFilter === "PRIMARY" ? "PRIMARY"
    : levelFilter === "LOW_SECONDARY" ? "SECONDARY"
    : levelFilter === "SECONDARY" ? "SECONDARY"
    : undefined;

  const relevantTBs = timeBlocks.filter(b =>
    !tbLevel || b.level === tbLevel || b.level === "BOTH"
  );

  // Days to show
  const days = dayFilter === 0 ? [1,2,3,4,5] : [dayFilter];

  // All unique time slots that have any assignment
  const assignedTimes = new Set(allAssignments.map(a => a.timeBlock.startTime));
  const uniqueTimes = Array.from(new Set(relevantTBs.map(b => b.startTime))).sort().filter(st => {
    const blocks = relevantTBs.filter(b => b.startTime === st);
    const isClass = blocks.some(b => b.blockType === "CLASS");
    if (isClass) return assignedTimes.has(st);
    // show BREAK/LUNCH/REGISTRATION if within range of assigned times
    const times = [...assignedTimes].sort();
    if (times.length === 0) return false;
    return st >= times[0] && st <= times[times.length - 1];
  });

  const getAssignments = (colId: string, day: number, time: string) => {
    if (viewMode === "grade") {
      return allAssignments.filter(a =>
        a.grade && grades.find(g => g.id === colId) &&
        a.grade.name === grades.find(g => g.id === colId)!.name &&
        (a.grade.section ?? "") === (grades.find(g => g.id === colId)!.section ?? "") &&
        a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time
      );
    } else {
      return allAssignments.filter(a =>
        a.teacher.id === colId &&
        a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time
      );
    }
  };

  const blockAt = (time: string) => relevantTBs.find(b => b.startTime === time);

  // Conflict detection for a slot
  const hasConflict = (colId: string, day: number, time: string) => {
    const as = getAssignments(colId, day, time);
    return as.some(a => a.status === "CONFLICT") || as.length > 1;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Master View</h1>
          {loading && <span className="text-xs text-blue-500 animate-pulse">Loading...</span>}
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> {t.schedule.print}
        </Button>
      </div>

      {/* Controls */}
      <div className="no-print flex flex-wrap gap-3 items-center bg-slate-50 dark:bg-slate-900 border rounded-lg px-4 py-3">
        {/* View mode */}
        <div className="flex items-center gap-1 border rounded overflow-hidden text-xs">
          <button
            onClick={() => setViewMode("grade")}
            className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "grade" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
          >
            <LayoutGrid className="w-3 h-3 inline mr-1" />{t.schedule.types.grade}
          </button>
          <button
            onClick={() => setViewMode("teacher")}
            className={`px-3 py-1.5 font-medium transition-colors ${viewMode === "teacher" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
          >
            <Users className="w-3 h-3 inline mr-1" />{t.schedule.types.teacher}
          </button>
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {availableLevels.map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                levelFilter === l ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 dark:text-slate-300 hover:border-blue-400"
              }`}
            >
              {levelLabel(l)}
            </button>
          ))}
        </div>

        {/* Day filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDayFilter(0)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${dayFilter === 0 ? "bg-slate-800 text-white border-slate-800" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}
          >
            All
          </button>
          {[1,2,3,4,5].map(d => (
            <button
              key={d}
              onClick={() => setDayFilter(d)}
              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${dayFilter === d ? "bg-slate-800 text-white border-slate-800" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}
            >
              {DAY_SHORT[d-1]}
            </button>
          ))}
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-3 border-2 border-slate-700">
        <table className="w-full" style={{borderCollapse:'collapse'}}>
          <tbody><tr>
            <td className="p-1 text-center align-middle border border-slate-400" style={{width:'56px'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="Oxford" style={{width:'44px',height:'auto',margin:'0 auto'}} />
            </td>
            <td className="text-center align-middle py-1 border border-slate-400">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">2026 — MASTER SCHEDULE</div>
              <div className="text-sm font-bold uppercase">
                {levelLabel(levelFilter)} · {dayFilter === 0 ? "All Days" : DAY_NAMES[dayFilter-1]} · {viewMode === "grade" ? "By Grade" : "By Teacher"}
              </div>
            </td>
          </tr></tbody>
        </table>
      </div>

      {/* Master grid */}
      {columns.length > 0 && (
        <div className="overflow-x-auto rounded-lg border shadow-sm" id="master-grid">
          <table className="border-collapse text-[11px]" style={{minWidth: `${Math.max(800, columns.length * 90 + 70)}px`}}>
            <thead>
              {/* Day headers — only if showing all days */}
              {dayFilter === 0 && (
                <tr className="bg-slate-800 text-white">
                  <th className="px-2 py-1.5 border-r border-slate-600 w-16 text-left text-[10px]">TIME</th>
                  {days.map(d => (
                    <th
                      key={d}
                      colSpan={columns.length}
                      className="px-2 py-1.5 text-center border-r border-slate-600 last:border-r-0 text-xs font-bold tracking-wide"
                    >
                      {DAY_NAMES[d-1].toUpperCase()}
                    </th>
                  ))}
                </tr>
              )}
              {/* Column headers */}
              <tr className="bg-blue-700 text-white">
                <th className="px-2 py-1 border-r border-blue-600 w-16 text-left text-[10px] sticky left-0 bg-blue-700">TIME</th>
                {days.map(d => columns.map((col, ci) => (
                  <th
                    key={`${d}-${col.id}`}
                    className={`px-1 py-1 text-center border-r border-blue-600 last:border-r-0 text-[10px] font-bold whitespace-nowrap ${
                      dayFilter !== 0 ? "" : ci === columns.length - 1 ? "border-r-2 border-slate-500" : ""
                    }`}
                    style={{minWidth:'80px', maxWidth:'100px'}}
                  >
                    {viewMode === "grade"
                      ? gradeLabel(col as Grade)
                      : (col as Teacher).name.split(" ").slice(0,2).join(" ")}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimes.map(time => {
                const block = blockAt(time);
                const isBreak = block?.blockType === "BREAK";
                const isLunch = block?.blockType === "LUNCH";
                const isReg   = block?.blockType === "REGISTRATION";
                const rowBg = isBreak ? "bg-blue-600" : isLunch ? "bg-amber-50 dark:bg-amber-950/20" : isReg ? "bg-slate-50 dark:bg-slate-800/30" : "";

                return (
                  <tr key={time} className={`border-t ${rowBg}`}>
                    <td className={`px-2 py-0.5 border-r font-mono text-[10px] font-bold whitespace-nowrap align-middle sticky left-0 ${
                      isBreak ? "bg-blue-600 text-white" : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                    }`}>
                      {time}<br/><span className="opacity-50 font-normal text-[9px]">{block?.endTime}</span>
                    </td>
                    {days.map(d => columns.map((col, ci) => {
                      const slot = getAssignments(col.id, d, time);
                      const conflict = hasConflict(col.id, d, time);
                      const isLast = ci === columns.length - 1;

                      return (
                        <td
                          key={`${d}-${col.id}-${time}`}
                          className={`px-0.5 py-0.5 border-r align-top ${
                            isBreak ? "text-center text-[9px] text-white font-bold" :
                            isLunch ? "text-center" : ""
                          } ${isLast && dayFilter === 0 ? "border-r-2 border-slate-400" : ""} ${
                            conflict ? "ring-1 ring-inset ring-red-400" : ""
                          }`}
                          style={{minWidth:'80px', maxWidth:'100px'}}
                        >
                          {slot.length === 0 ? (
                            isBreak ? <span className="text-[9px]">BREAK</span> :
                            isLunch ? <span className="text-[9px] text-amber-500 font-bold">LUNCH</span> :
                            isReg   ? <span className="text-[9px] text-slate-300">REG</span> : null
                          ) : (
                            <div className="flex flex-col gap-px">
                              {slot.map((a, ai) => (
                                <div
                                  key={a.id + ai}
                                  className="px-1 py-px rounded text-[10px] leading-tight border"
                                  style={{
                                    background: subjectColor(a.subject.name),
                                    borderColor: subjectColor(a.subject.name),
                                    filter: 'saturate(1.5)'
                                  }}
                                >
                                  <div className="font-semibold truncate" style={{maxWidth:'90px'}}>{a.subject.name}</div>
                                  {viewMode === "grade" && (
                                    <div className="opacity-70 truncate text-[9px]">{a.teacher.name.split(" ")[0]}</div>
                                  )}
                                  {viewMode === "teacher" && a.grade && (
                                    <div className="opacity-70 text-[9px]">{a.grade.name}{a.grade.section ?? ""}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    }))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {columns.length === 0 && !loading && (
        <div className="text-center py-16 text-slate-400">
          <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No data for selected level</p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 6mm; }
          .no-print { display: none !important; }
          body { padding: 0 !important; margin: 0 !important; background: white !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          header, footer, nav { display: none !important; }
          #master-grid table { font-size: 7px !important; }
          #master-grid th, #master-grid td { padding: 1px 2px !important; }
        }
      `}</style>
    </div>
  );
}
