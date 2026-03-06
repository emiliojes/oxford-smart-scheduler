"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, X, Plus, AlertTriangle, Users, GripVertical, ChevronDown, ChevronUp, Trash2, MoveRight, CheckCircle2 } from "lucide-react";

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

interface DetectedConflict {
  type: "TEACHER_DOUBLE" | "ROOM" | "GRADE";
  label: string;
  day: number;
  time: string;
  assignments: (Assignment & { _tid: string; _tidx: number })[];
}

const DAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
const isDuty = (name: string) => DUTY_KEYWORDS.some(k => name.includes(k));

function fmtSlot(day: number, time: string) {
  return `${DAY_SHORT[day - 1]} ${time}`;
}

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
  const [dragging, setDragging] = useState<{ assignmentId: string; tid: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null); // "day-time"
  const [saving, setSaving] = useState(false);
  const [conflictPanelOpen, setConflictPanelOpen] = useState(true);
  const [movingAssignment, setMovingAssignment] = useState<(Assignment & { _tid: string; _tidx: number }) | null>(null);
  const [moveTargetDay, setMoveTargetDay] = useState<number>(1);
  const [moveTargetTime, setMoveTargetTime] = useState<string>("");

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

  const refreshTeacher = async (tid: string) => {
    const res = await fetch(`/api/assignments?teacherId=${tid}`);
    if (res.ok) {
      const data = await res.json();
      setAllAssignments(prev => ({ ...prev, [tid]: data }));
    }
  };

  const handleDragStart = (assignmentId: string, tid: string) => {
    setDragging({ assignmentId, tid });
  };

  const handleDrop = async (targetDay: number, targetTime: string) => {
    if (!dragging) return;
    setDragOver(null);
    // Find the target timeBlock
    const targetBlock = timeBlocks.find(b => b.dayOfWeek === targetDay && b.startTime === targetTime);
    if (!targetBlock) { toast.error("Slot no encontrado"); setDragging(null); return; }
    // Check it's a CLASS slot
    if (targetBlock.blockType !== "CLASS") { toast.error("Solo puedes mover a slots de clase"); setDragging(null); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${dragging.assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeBlockId: targetBlock.id }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || "Error al mover"); }
      else {
        toast.success("Clase movida correctamente");
        await refreshTeacher(dragging.tid);
      }
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); setDragging(null); }
  };

  // Build unified time slots
  const uniqueTimes = Array.from(new Set(timeBlocks.map(b => b.startTime))).sort();

  // ── Conflict detection ────────────────────────────────────────────────────
  const detectedConflicts: DetectedConflict[] = [];
  const conflictCellKeys = new Set<string>(); // for grid highlighting

  for (const time of uniqueTimes) {
    for (let d = 1; d <= 5; d++) {
      // Gather all assignments at this slot across selected teachers
      const slotAll = selected.flatMap((tid, tidx) =>
        (allAssignments[tid] || [])
          .filter(a => a.timeBlock.dayOfWeek === d && a.timeBlock.startTime === time)
          .map(a => ({ ...a, _tid: tid, _tidx: tidx }))
      );

      // 1. Teacher double-booked (same teacher, 2+ assignments at same time)
      const teacherMap: Record<string, typeof slotAll> = {};
      slotAll.forEach(a => {
        if (!teacherMap[a._tid]) teacherMap[a._tid] = [];
        teacherMap[a._tid].push(a);
      });
      Object.entries(teacherMap).forEach(([tid, as]) => {
        if (as.length > 1) {
          const t = teachers.find(t => t.id === tid);
          detectedConflicts.push({
            type: "TEACHER_DOUBLE",
            label: `${t?.name ?? tid}: doble clase`,
            day: d, time,
            assignments: as,
          });
          as.forEach(a => conflictCellKeys.add(`${a._tid}-${d}-${time}`));
        }
      });

      // 2. Room conflict (2 different teachers in same room)
      const roomMap: Record<string, typeof slotAll> = {};
      slotAll.filter(a => a.room).forEach(a => {
        const r = a.room!.name;
        if (!roomMap[r]) roomMap[r] = [];
        roomMap[r].push(a);
      });
      Object.entries(roomMap).forEach(([room, as]) => {
        const uniqueTeachers = new Set(as.map(a => a._tid));
        if (uniqueTeachers.size > 1) {
          detectedConflicts.push({
            type: "ROOM",
            label: `Sala ${room}: ocupada por ${uniqueTeachers.size} profesores`,
            day: d, time,
            assignments: as,
          });
          as.forEach(a => conflictCellKeys.add(`${a._tid}-${d}-${time}`));
        }
      });

      // 3. Grade conflict (same grade, 2+ assignments at same time, across all assignments)
      const gradeMap: Record<string, typeof slotAll> = {};
      slotAll.filter(a => a.grade).forEach(a => {
        const g = `${a.grade!.name}${a.grade!.section ?? ""}`;
        if (!gradeMap[g]) gradeMap[g] = [];
        gradeMap[g].push(a);
      });
      Object.entries(gradeMap).forEach(([grade, as]) => {
        const uniqueT = new Set(as.map(a => a._tid));
        if (uniqueT.size > 1) {
          detectedConflicts.push({
            type: "GRADE",
            label: `Grado ${grade}: 2 clases simultáneas`,
            day: d, time,
            assignments: as,
          });
          as.forEach(a => conflictCellKeys.add(`${a._tid}-${d}-${time}`));
        }
      });
    }
  }

  // Free CLASS slots per day (for move target selector)
  const freeSlots = uniqueTimes
    .filter(t => timeBlocks.find(b => b.startTime === t)?.blockType === "CLASS")
    .flatMap(t => [1,2,3,4,5].map(d => ({ day: d, time: t })))
    .filter(({ day, time }) =>
      selected.every(tid =>
        !(allAssignments[tid] || []).some(
          a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time
        )
      )
    );

  // Move assignment handler
  const handleMoveAssignment = async () => {
    if (!movingAssignment || !moveTargetTime) return;
    const targetBlock = timeBlocks.find(b => b.dayOfWeek === moveTargetDay && b.startTime === moveTargetTime);
    if (!targetBlock) { toast.error("Slot no encontrado"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${movingAssignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeBlockId: targetBlock.id }),
      });
      if (res.ok) {
        toast.success("Clase movida");
        await refreshTeacher(movingAssignment._tid);
        setMovingAssignment(null);
      } else {
        const r = await res.json();
        toast.error(r.error || "Error al mover");
      }
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  };

  const handleDeleteAssignment = async (a: Assignment & { _tid: string }) => {
    if (!confirm(`¿Eliminar "${a.subject.name}" de ${a.teacher.name}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/assignments/${a.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Clase eliminada");
        await refreshTeacher(a._tid);
      } else toast.error("Error al eliminar");
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  };

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
          {detectedConflicts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="w-3 h-3" /> {detectedConflicts.length} conflicto{detectedConflicts.length > 1 ? "s" : ""}
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

      {/* ── Conflict Panel ── */}
      {selected.length > 0 && (
        <div className={`no-print rounded-lg border ${
          detectedConflicts.length > 0 ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800" : "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800"
        }`}>
          <button
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold"
            onClick={() => setConflictPanelOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              {detectedConflicts.length > 0
                ? <AlertTriangle className="w-4 h-4 text-red-500" />
                : <CheckCircle2 className="w-4 h-4 text-green-500" />}
              <span className={detectedConflicts.length > 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300"}>
                {detectedConflicts.length > 0
                  ? `${detectedConflicts.length} conflicto${detectedConflicts.length > 1 ? "s" : ""} detectado${detectedConflicts.length > 1 ? "s" : ""}`
                  : "Sin conflictos detectados"}
              </span>
            </div>
            {conflictPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {conflictPanelOpen && detectedConflicts.length > 0 && (
            <div className="px-4 pb-4 space-y-3">
              {detectedConflicts.map((c, ci) => (
                <div key={ci} className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px]">
                      {c.type === "TEACHER_DOUBLE" ? "Doble clase" : c.type === "ROOM" ? "Sala" : "Grado"}
                    </Badge>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{c.label}</span>
                    <span className="text-xs text-slate-400 ml-auto">{fmtSlot(c.day, c.time)}</span>
                  </div>

                  {/* Conflicting assignments */}
                  <div className="flex flex-col gap-1.5">
                    {c.assignments.map((a, ai) => {
                      const colorClass = TEACHER_COLORS[a._tidx % TEACHER_COLORS.length];
                      const grade = a.grade ? `${a.grade.name}${a.grade.section ?? ""}` : "";
                      const isMoving = movingAssignment?.id === a.id;
                      return (
                        <div key={a.id + ai} className="space-y-1">
                          <div className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs ${colorClass}`}>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold">{a.subject.name}</span>
                              <span className="opacity-70 ml-1">{a.teacher.name}</span>
                              {grade && <span className="opacity-60 ml-1">· {grade}</span>}
                              {a.room && <span className="opacity-60 ml-1">· {a.room.name}</span>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] gap-1"
                                onClick={() => {
                                  setMovingAssignment(isMoving ? null : a);
                                  setMoveTargetDay(c.day);
                                  setMoveTargetTime("");
                                }}
                              >
                                <MoveRight className="w-3 h-3" />
                                {isMoving ? "Cancelar" : "Mover"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[10px] gap-1 text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => handleDeleteAssignment(a)}
                                disabled={saving}
                              >
                                <Trash2 className="w-3 h-3" />
                                Quitar
                              </Button>
                            </div>
                          </div>

                          {/* Move controls */}
                          {isMoving && (
                            <div className="flex items-center gap-2 pl-2 flex-wrap">
                              <span className="text-[10px] text-slate-500">Mover a:</span>
                              <select
                                className="text-xs border rounded px-2 py-0.5 bg-white dark:bg-slate-800"
                                value={moveTargetDay}
                                onChange={e => { setMoveTargetDay(Number(e.target.value)); setMoveTargetTime(""); }}
                              >
                                {DAY_SHORT.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
                              </select>
                              <select
                                className="text-xs border rounded px-2 py-0.5 bg-white dark:bg-slate-800"
                                value={moveTargetTime}
                                onChange={e => setMoveTargetTime(e.target.value)}
                              >
                                <option value="">-- hora --</option>
                                {uniqueTimes
                                  .filter(t => timeBlocks.find(b => b.startTime === t)?.blockType === "CLASS")
                                  .map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                className="h-6 px-3 text-[10px]"
                                disabled={!moveTargetTime || saving}
                                onClick={handleMoveAssignment}
                              >
                                Confirmar
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Drag hint */}
      {selected.length > 0 && (
        <p className="no-print text-xs text-slate-400 flex items-center gap-1">
          <GripVertical className="w-3 h-3" /> Arrastra una clase a otro slot para moverla
          {saving && <span className="ml-2 text-blue-500 animate-pulse">Guardando...</span>}
        </p>
      )}

      {/* Grid */}
      {selected.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-2 py-2 text-left font-bold w-24 border-r border-slate-600">HORA</th>
                {DAYS.map((d) => (
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
                const isClass = block?.blockType === "CLASS";
                const rowBg = isBreak ? "bg-slate-50 dark:bg-slate-800/50" : isLunch ? "bg-amber-50/60 dark:bg-amber-950/20" : isReg ? "bg-slate-50/50" : "";

                return (
                  <tr key={time} className={`border-t ${rowBg}`}>
                    <td className="px-2 py-1 font-mono text-[10px] text-slate-500 border-r whitespace-nowrap align-top">
                      {time}<br /><span className="text-slate-400">{block?.endTime}</span>
                    </td>
                    {[1,2,3,4,5].map(day => {
                      const cellKey = `${day}-${time}`;
                      const isDragTarget = dragOver === cellKey && isClass;
                      const slotAssignments = selected.flatMap((tid, tidx) =>
                        (allAssignments[tid] || [])
                          .filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time)
                          .map(a => ({ ...a, _tidx: tidx, _tid: tid }))
                      );

                      if (slotAssignments.length === 0) {
                        if (isBreak) return (
                          <td key={day} className="px-2 py-1 text-center text-[9px] text-slate-400 border-r last:border-r-0">BREAK</td>
                        );
                        if (isLunch) return (
                          <td key={day} className="px-2 py-1 text-center text-[9px] text-amber-500 font-medium border-r last:border-r-0">LUNCH</td>
                        );
                        // Empty class slot — valid drop target
                        return (
                          <td
                            key={day}
                            className={`border-r last:border-r-0 min-h-[40px] transition-colors ${
                              isDragTarget ? "bg-blue-100 dark:bg-blue-900/40 border-2 border-dashed border-blue-400" : ""
                            }`}
                            onDragOver={e => { if (dragging && isClass) { e.preventDefault(); setDragOver(cellKey); } }}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={() => handleDrop(day, time)}
                          />
                        );
                      }

                      return (
                        <td
                          key={day}
                          className={`px-1 py-1 border-r last:border-r-0 align-top transition-colors ${
                            isDragTarget ? "bg-blue-100 dark:bg-blue-900/40 ring-2 ring-inset ring-blue-400" : ""
                          }`}
                          onDragOver={e => { if (dragging && isClass) { e.preventDefault(); setDragOver(cellKey); } }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={() => handleDrop(day, time)}
                        >
                          <div className="flex flex-col gap-0.5">
                            {slotAssignments.map((a: any, ai) => {
                              const isConflict = conflictCellKeys.has(`${a._tid}-${day}-${time}`);
                              const colorClass = TEACHER_COLORS[a._tidx % TEACHER_COLORS.length];
                              const grade = a.grade ? `${a.grade.name}${a.grade.section || ""}` : "";
                              const isDraggingThis = dragging?.assignmentId === a.id;
                              return (
                                <div
                                  key={a.id + ai}
                                  draggable
                                  onDragStart={() => handleDragStart(a.id, a._tid)}
                                  onDragEnd={() => { setDragging(null); setDragOver(null); }}
                                  className={`px-1.5 py-0.5 rounded border text-[10px] leading-tight cursor-grab active:cursor-grabbing select-none transition-opacity ${
                                    colorClass
                                  } ${
                                    isConflict ? "ring-1 ring-red-500" : ""
                                  } ${
                                    isDraggingThis ? "opacity-40" : "opacity-100"
                                  }`}
                                >
                                  <div className="flex items-start gap-0.5">
                                    <GripVertical className="w-2.5 h-2.5 mt-0.5 opacity-40 shrink-0" />
                                    <div>
                                      {isConflict && <AlertTriangle className="w-2.5 h-2.5 inline text-red-500 mr-0.5" />}
                                      <span className="font-semibold">{a.subject.name}</span>
                                      {grade && <span className="block opacity-75">{grade}</span>}
                                      {a.room && <span className="block opacity-60">{a.room.name}</span>}
                                      <span className="block opacity-50 font-medium">{selectedTeachers[a._tidx]?.name.split(" ")[0]}</span>
                                    </div>
                                  </div>
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
