"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

interface Grade {
  id: string;
  name: string;
  section: string | null;
  level: string;
}

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { name: string };
  grade: { name: string; section: string | null } | null;
  room: { name: string } | null;
  timeBlock: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    blockType: string;
    duration: string;
  };
  note: string | null;
  status: string;
}

interface TimeBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  blockType: string;
  duration: string;
  level: string;
}

const LEVEL_ORDER = ["PRIMARY", "LOW_SECONDARY", "SECONDARY", "BOTH"];
const GRADE_ORDER = ["K", "PK", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function sortGrades(grades: Grade[]) {
  return [...grades].sort((a, b) => {
    const li = LEVEL_ORDER.indexOf(a.level);
    const lj = LEVEL_ORDER.indexOf(b.level);
    if (li !== lj) return li - lj;
    const ni = GRADE_ORDER.indexOf(a.name);
    const nj = GRADE_ORDER.indexOf(b.name);
    if (ni !== nj) return (ni === -1 ? 99 : ni) - (nj === -1 ? 99 : nj);
    return (a.section ?? "").localeCompare(b.section ?? "");
  });
}

function gradeLabel(g: Grade) {
  const prefix = g.level === "PRIMARY" || g.level === "BOTH" ? "Grade" : "Grade";
  const name = g.name === "K" ? "Kinder" : g.name;
  return `${name}${g.section ? ` ${g.section}` : ""}`;
}

export default function GradeSchedulePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/grades").then(r => r.json()),
      fetch("/api/time-blocks").then(r => r.json()),
    ]).then(([g, tb]) => {
      const sorted = sortGrades(g);
      setGrades(sorted);
      setTimeBlocks(tb);
      if (sorted.length > 0) setSelectedGradeId(sorted[0].id);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedGradeId) return;
    setLoading(true);
    fetch(`/api/assignments?gradeId=${selectedGradeId}`)
      .then(r => r.json())
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedGradeId]);

  const selectedGrade = grades.find(g => g.id === selectedGradeId);
  const selectedIdx = grades.findIndex(g => g.id === selectedGradeId);

  const goNext = () => { if (selectedIdx < grades.length - 1) setSelectedGradeId(grades[selectedIdx + 1].id); };
  const goPrev = () => { if (selectedIdx > 0) setSelectedGradeId(grades[selectedIdx - 1].id); };

  // Get the homeroom teacher (most assignments)
  const teacherCount: Record<string, { name: string; count: number }> = {};
  assignments.forEach(a => {
    const tid = a.teacher.id;
    if (!teacherCount[tid]) teacherCount[tid] = { name: a.teacher.name, count: 0 };
    teacherCount[tid].count++;
  });
  const homeroomTeacher = Object.values(teacherCount).sort((a, b) => b.count - a.count)[0]?.name ?? "";

  // Build time slots — filter to relevant level
  const gradeLevel = selectedGrade?.level ?? "";
  const relevantTBs = timeBlocks.filter(b =>
    b.level === gradeLevel || b.level === "BOTH" ||
    (gradeLevel === "LOW_SECONDARY" && b.level === "SECONDARY") ||
    gradeLevel === ""
  );

  const assignmentTimes = new Set(assignments.map(a => a.timeBlock.startTime));
  const firstTime = [...assignmentTimes].sort()[0] ?? "";
  const lastTime  = [...assignmentTimes].sort().reverse()[0] ?? "";

  const uniqueTimes = Array.from(new Set(relevantTBs.map(b => b.startTime))).sort().filter(st => {
    const blocks = relevantTBs.filter(b => b.startTime === st);
    const isClass = blocks.some(b => b.blockType === "CLASS");
    if (isClass) return assignmentTimes.has(st);
    if (assignmentTimes.has(st)) return true;
    if (!firstTime) return false;
    return st >= firstTime && st <= lastTime;
  });

  const DAYS = t.timeBlocks.days as string[];

  const getSlot = (day: number, time: string) =>
    assignments.filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time);

  const blockAt = (time: string) => relevantTBs.find(b => b.startTime === time);

  // Subject color map
  const subjectColors = [
    "bg-blue-100 text-blue-800 border-blue-300",
    "bg-emerald-100 text-emerald-800 border-emerald-300",
    "bg-violet-100 text-violet-800 border-violet-300",
    "bg-amber-100 text-amber-800 border-amber-300",
    "bg-rose-100 text-rose-800 border-rose-300",
    "bg-cyan-100 text-cyan-800 border-cyan-300",
    "bg-orange-100 text-orange-800 border-orange-300",
    "bg-teal-100 text-teal-800 border-teal-300",
    "bg-indigo-100 text-indigo-800 border-indigo-300",
    "bg-pink-100 text-pink-800 border-pink-300",
    "bg-lime-100 text-lime-800 border-lime-300",
    "bg-sky-100 text-sky-800 border-sky-300",
  ];
  const subjectColorMap: Record<string, string> = {};
  let colorIdx = 0;
  assignments.forEach(a => {
    if (!subjectColorMap[a.subject.name]) {
      subjectColorMap[a.subject.name] = subjectColors[colorIdx % subjectColors.length];
      colorIdx++;
    }
  });

  const levelGroups: Record<string, Grade[]> = {};
  grades.forEach(g => {
    if (!levelGroups[g.level]) levelGroups[g.level] = [];
    levelGroups[g.level].push(g);
  });

  const levelLabel = (l: string) => {
    if (l === "PRIMARY") return t.teachers.levels.PRIMARY;
    if (l === "LOW_SECONDARY") return t.teachers.levels.LOW_SECONDARY;
    if (l === "SECONDARY") return t.teachers.levels.SECONDARY;
    return l;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t.schedule.types.grade} — {t.schedule.title}
          </h1>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> {t.schedule.print}
        </Button>
      </div>

      {/* Grade selector */}
      <div className="no-print flex flex-wrap gap-4 items-start">
        {LEVEL_ORDER.filter(l => levelGroups[l]).map(level => (
          <div key={level}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">{levelLabel(level)}</p>
            <div className="flex flex-wrap gap-1">
              {levelGroups[level].map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGradeId(g.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    g.id === selectedGradeId
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-slate-800 border-slate-300 hover:border-blue-400 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {gradeLabel(g)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next navigation */}
      {selectedGrade && (
        <div className="no-print flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={selectedIdx === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {selectedIdx > 0 ? gradeLabel(grades[selectedIdx - 1]) : ""}
          </Button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {selectedIdx + 1} / {grades.length}
          </span>
          <Button variant="ghost" size="sm" onClick={goNext} disabled={selectedIdx === grades.length - 1}>
            {selectedIdx < grades.length - 1 ? gradeLabel(grades[selectedIdx + 1]) : ""} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Schedule grid */}
      {selectedGrade && (
        <div id="printable-grade-schedule">
          {/* Print header — Excel style matching Oxford PNG schedules */}
          <div className="hidden print:block mb-3">
            <table className="w-full border-2 border-slate-700" style={{borderCollapse:'collapse'}}>
              <tbody>
                <tr>
                  <td className="w-16 border border-slate-700 p-1 text-center align-middle" rowSpan={2}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.jpg" alt="Oxford Logo" style={{width:'48px',height:'auto',margin:'0 auto'}} />
                  </td>
                  <td className="border border-slate-700 text-center align-middle py-1" colSpan={5}>
                    <div className="text-sm font-bold uppercase tracking-wide">2026 CLASS SCHEDULE</div>
                    <div className="text-base font-bold uppercase">
                      {gradeLabel(selectedGrade)}{homeroomTeacher ? ` - ${homeroomTeacher}` : ""}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Screen header */}
          <div className="no-print flex items-center gap-3 mb-3">
            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              <div className="text-xs opacity-80">2026 CLASS SCHEDULE</div>
              <div className="text-lg font-bold">{gradeLabel(selectedGrade)}</div>
            </div>
            {homeroomTeacher && (
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Homeroom teacher:</span> {homeroomTeacher}
              </div>
            )}
            {loading && <span className="text-xs text-blue-500 animate-pulse ml-2">Cargando...</span>}
          </div>

          {/* Grid table */}
          <div className="overflow-x-auto rounded-lg border shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="px-3 py-2 text-left font-bold w-28 border-r border-blue-600 print:text-xs">
                    {t.schedule.grid.time}
                  </th>
                  {DAYS.map((day, i) => (
                    <th key={i} className="px-3 py-2 text-center font-bold border-r border-blue-600 last:border-r-0 print:text-xs">
                      {day.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueTimes.map(time => {
                  const block = blockAt(time);
                  const isBreak = block?.blockType === "BREAK";
                  const isLunch = block?.blockType === "LUNCH";
                  const isReg   = block?.blockType === "REGISTRATION";
                  const rowBg = isBreak
                    ? "bg-blue-600 text-white"
                    : isLunch
                    ? "bg-amber-100 dark:bg-amber-950/30"
                    : isReg
                    ? "bg-blue-50 dark:bg-slate-800/50"
                    : "";

                  return (
                    <tr key={time} className={`border-t ${rowBg}`}>
                      <td className={`px-3 py-1.5 font-mono text-xs font-bold border-r whitespace-nowrap print:px-1 ${
                        isBreak ? "text-white" : "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                      }`}>
                        {time}<br />
                        <span className="opacity-60 font-normal">{block?.endTime}</span>
                      </td>
                      {[1,2,3,4,5].map(day => {
                        const slot = getSlot(day, time);
                        return (
                          <td key={day} className={`px-1.5 py-1 border-r last:border-r-0 align-middle print:px-1 ${
                            isBreak ? "text-center text-xs font-bold text-white" : ""
                          }`}>
                            {slot.length === 0 ? (
                              isBreak ? (
                                <span className="text-xs font-bold tracking-widest">BREAK</span>
                              ) : isLunch ? (
                                <span className="text-xs font-bold text-amber-600 tracking-widest">LUNCH</span>
                              ) : isReg ? (
                                <span className="text-xs text-slate-400 tracking-widest">REGISTRATION</span>
                              ) : null
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {slot.map((a, ai) => {
                                  const color = subjectColorMap[a.subject.name] ?? subjectColors[0];
                                  return (
                                    <div
                                      key={a.id + ai}
                                      className={`px-2 py-1 rounded border text-xs font-medium leading-tight print:text-[8px] print:py-0.5 ${color} ${
                                        a.status === "CONFLICT" ? "ring-1 ring-red-500" : ""
                                      }`}
                                    >
                                      <div className="font-semibold truncate">{a.subject.name}</div>
                                      {a.note && (
                                        <div className="text-[10px] opacity-70 print:text-[7px]">({a.note})</div>
                                      )}
                                      {slot.length > 1 && (
                                        <div className="text-[10px] opacity-60 truncate print:text-[7px]">{a.teacher.name.split(" ")[0]}</div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Print footer */}
          <div className="hidden print:flex justify-between mt-10 px-4">
            <div className="border-t border-slate-400 w-44 text-center pt-1 text-[9px] font-bold">{t.schedule.export.coordination}</div>
            <div className="text-[9px] text-slate-400 self-end">www.oxford.edu.pa</div>
            <div className="border-t border-slate-400 w-44 text-center pt-1 text-[9px] font-bold">{t.schedule.export.direction}</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm 6mm; }
          .no-print { display: none !important; }
          body { padding: 0 !important; margin: 0 !important; background: white !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          header, footer, nav { display: none !important; }
          #printable-grade-schedule table { width: 100%; font-size: 7px; border-collapse: collapse; }
          #printable-grade-schedule th, #printable-grade-schedule td { padding: 1px 2px !important; line-height: 1.2; }
        }
      `}</style>
    </div>
  );
}
