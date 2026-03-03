"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, X, Plus, AlertTriangle, Users } from "lucide-react";

interface Teacher { id: string; name: string; }
interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { name: string };
  grade: { name: string; section: string | null } | null;
  room: { name: string } | null;
  timeBlock: { dayOfWeek: number; startTime: string; endTime: string; blockType: string; duration: string };
  note: string | null;
}

const DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
const isDuty = (name: string) => DUTY_KEYWORDS.some(k => name.includes(k));

const TEACHER_COLORS = [
  "bg-blue-100 border-blue-400 text-blue-900",
  "bg-emerald-100 border-emerald-400 text-emerald-900",
  "bg-violet-100 border-violet-400 text-violet-900",
  "bg-amber-100 border-amber-400 text-amber-900",
  "bg-rose-100 border-rose-400 text-rose-900",
  "bg-cyan-100 border-cyan-400 text-cyan-900",
];

export default function ComparePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [allAssignments, setAllAssignments] = useState<Record<string, Assignment[]>>({});
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "ADMIN" && user.role !== "COORDINATOR") {
      router.replace("/schedule");
      return;
    }
    fetch("/api/teachers").then(r => r.json()).then(setTeachers).catch(() => {});
    fetch("/api/time-blocks").then(r => r.json()).then(setTimeBlocks).catch(() => {});
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addTeacher = async (id: string) => {
    if (selected.includes(id) || selected.length >= 6) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/assignments?teacherId=${id}`);
      const data = await res.json();
      setAllAssignments(prev => ({ ...prev, [id]: data }));
      setSelected(prev => [...prev, id]);
    } catch { toast.error("Error cargando horario"); }
    finally { setLoadingId(null); setSearch(""); setDropOpen(false); }
  };

  const removeTeacher = (id: string) => {
    setSelected(prev => prev.filter(x => x !== id));
    setAllAssignments(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  // Build unified time slots
  const uniqueTimes = Array.from(new Set(timeBlocks.map(b => b.startTime))).sort();

  // Detect conflicts: same slot, same teacher appears twice (shouldn't happen) OR
  // same room used by 2 selected teachers at the same time
  const conflicts = new Set<string>();
  for (const time of uniqueTimes) {
    for (let d = 1; d <= 5; d++) {
      const key = `${d}-${time}`;
      // Room conflict: 2 teachers in same room at same time
      const roomMap: Record<string, string[]> = {};
      for (const tid of selected) {
        const slot = (allAssignments[tid] || []).filter(
          a => a.timeBlock.dayOfWeek === d && a.timeBlock.startTime === time && a.room
        );
        slot.forEach(a => {
          const r = a.room!.name;
          if (!roomMap[r]) roomMap[r] = [];
          roomMap[r].push(tid);
        });
      }
      Object.values(roomMap).forEach(tids => {
        if (tids.length > 1) tids.forEach(tid => conflicts.add(`${tid}-${d}-${time}`));
      });
    }
  }

  const selectedTeachers = selected.map(id => teachers.find(t => t.id === id)).filter(Boolean) as Teacher[];
  const filteredTeachers = teachers.filter(t =>
    !selected.includes(t.id) && t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Hours per teacher
  const teacherHours = (tid: string) => {
    const as = allAssignments[tid] || [];
    const teaching = as.filter(a => a.timeBlock.blockType === "CLASS" && !isDuty(a.subject.name));
    const unique = Array.from(new Map(teaching.map(a => [`${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`, a])).values());
    const mins = unique.reduce((s, a) => s + parseFloat(String(a.timeBlock.duration ?? 0)), 0);
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Comparar Horarios</h1>
          <Badge variant="outline">{selected.length}/6 profesores</Badge>
        </div>
        <div className="flex gap-2">
          {conflicts.size > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> {conflicts.size > 0 ? "Conflictos detectados" : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1 no-print" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Teacher selector */}
      <div className="no-print flex flex-wrap gap-2 items-center">
        {selectedTeachers.map((t, i) => (
          <div key={t.id} className={`flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-medium ${TEACHER_COLORS[i % TEACHER_COLORS.length]}`}>
            <span>{t.name}</span>
            <span className="text-xs opacity-70">· {teacherHours(t.id)}</span>
            <button onClick={() => removeTeacher(t.id)} className="ml-1 hover:opacity-70"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {selected.length < 6 && (
          <div className="relative" ref={dropRef}>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setDropOpen(v => !v)}>
              <Plus className="w-4 h-4" /> Agregar profesor
            </Button>
            {dropOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-72 bg-white dark:bg-slate-900 border rounded-lg shadow-lg">
                <input
                  autoFocus
                  className="w-full px-3 py-2 text-sm border-b outline-none bg-transparent"
                  placeholder="Buscar profesor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <div className="max-h-60 overflow-y-auto">
                  {filteredTeachers.length === 0 && (
                    <p className="text-xs text-slate-400 p-3">No hay resultados</p>
                  )}
                  {filteredTeachers.map(t => (
                    <button
                      key={t.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => addTeacher(t.id)}
                      disabled={loadingId === t.id}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selected.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Selecciona hasta 6 profesores para comparar sus horarios</p>
          <p className="text-sm mt-1">Se detectarán conflictos de sala automáticamente</p>
        </div>
      )}

      {/* Legend for print */}
      {selected.length > 0 && (
        <div className="hidden print:flex flex-wrap gap-3 mb-2">
          {selectedTeachers.map((t, i) => (
            <div key={t.id} className="flex items-center gap-1 text-xs font-medium">
              <div className="w-3 h-3 rounded-sm border" style={{ background: ["#dbeafe","#d1fae5","#ede9fe","#fef3c7","#ffe4e6","#cffafe"][i % 6] }} />
              <span>{t.name} ({teacherHours(t.id)})</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {selected.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2 text-left font-bold w-24 border-r border-slate-600">HORA</th>
                {DAYS.map((d, i) => (
                  <th key={d} className="px-2 py-2 text-center font-bold border-r border-slate-600 last:border-r-0">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueTimes.map(time => {
                const block = timeBlocks.find(b => b.startTime === time);
                const isBreak = block?.blockType === "BREAK";
                const isLunch = block?.blockType === "LUNCH";
                const isReg = block?.blockType === "REGISTRATION";
                const rowBg = isBreak ? "bg-slate-50 dark:bg-slate-800/50" : isLunch ? "bg-amber-50/60 dark:bg-amber-950/20" : isReg ? "bg-slate-50/50" : "";

                return (
                  <tr key={time} className={`border-t ${rowBg}`}>
                    <td className="px-2 py-1 font-mono text-[10px] text-slate-500 border-r whitespace-nowrap align-top">
                      {time}<br /><span className="text-slate-400">{block?.endTime}</span>
                    </td>
                    {[1,2,3,4,5].map(day => {
                      const cellKey = `${day}-${time}`;
                      const slotAssignments = selected.flatMap((tid, tidx) =>
                        (allAssignments[tid] || [])
                          .filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time)
                          .map(a => ({ ...a, _tidx: tidx, _tid: tid }))
                      );

                      if (slotAssignments.length === 0) {
                        if (isBreak) return <td key={day} className="px-2 py-1 text-center text-[9px] text-slate-400 border-r last:border-r-0">BREAK</td>;
                        if (isLunch) return <td key={day} className="px-2 py-1 text-center text-[9px] text-amber-500 font-medium border-r last:border-r-0">LUNCH</td>;
                        return <td key={day} className="border-r last:border-r-0" />;
                      }

                      return (
                        <td key={day} className="px-1 py-1 border-r last:border-r-0 align-top">
                          <div className="flex flex-col gap-0.5">
                            {slotAssignments.map((a: any, ai) => {
                              const isConflict = conflicts.has(`${a._tid}-${day}-${time}`);
                              const colorClass = TEACHER_COLORS[a._tidx % TEACHER_COLORS.length];
                              const grade = a.grade ? `${a.grade.name}${a.grade.section || ""}` : "";
                              return (
                                <div
                                  key={a.id + ai}
                                  className={`px-1.5 py-0.5 rounded border text-[10px] leading-tight ${colorClass} ${isConflict ? "ring-1 ring-red-500" : ""}`}
                                >
                                  {isConflict && <AlertTriangle className="w-2.5 h-2.5 inline text-red-500 mr-0.5" />}
                                  <span className="font-semibold">{a.subject.name}</span>
                                  {grade && <span className="block opacity-75">{grade}</span>}
                                  {a.room && <span className="block opacity-60">{a.room.name}</span>}
                                  <span className="block opacity-50 font-medium">{selectedTeachers[a._tidx]?.name.split(" ")[0]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
