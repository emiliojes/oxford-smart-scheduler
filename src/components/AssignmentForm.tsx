"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useHistory } from "@/context/HistoryContext";

interface Teacher { id: string; name: string; level: string; }
interface Subject { id: string; name: string; level: string; }
interface Grade { id: string; name: string; section: string | null; level: string; }
interface Room { id: string; name: string; isSpecialized: boolean; }
interface TimeBlock { id: string; dayOfWeek: number; startTime: string; endTime: string; blockType: string; level: string; }
interface Assignment { id: string; teacherId: string; gradeId: string; roomId: string; timeBlockId: string; }

interface AssignmentFormProps {
  initialData?: any;
  onSuccess: (id?: string) => void;
  trigger?: React.ReactNode;
  prefilledTimeBlock?: { dayOfWeek: number; startTime: string };
  prefilledGradeId?: string;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function AssignmentForm({ initialData, onSuccess, trigger, prefilledTimeBlock, prefilledGradeId }: AssignmentFormProps) {
  const { t } = useLanguage();
  const { pushAction } = useHistory();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // All data
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);

  // Filter state
  const [selectedDay, setSelectedDay] = useState<string>(
    prefilledTimeBlock?.dayOfWeek?.toString() || 
    initialData?.timeBlock?.dayOfWeek?.toString() || 
    ""
  );
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    teacherId: initialData?.teacherId || "",
    subjectId: initialData?.subjectId || "",
    gradeId: initialData?.gradeId || "",
    roomId: initialData?.roomId || "",   // optional
    timeBlockId: initialData?.timeBlockId || "",
    note: initialData?.note || "",       // optional
  });

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  // Once data is loaded, auto-set grade + level + preferred time block
  useEffect(() => {
    if (grades.length === 0 || timeBlocks.length === 0) return;

    const updates: Partial<typeof formData> = {};
    let preferredLevel = "";

    if (prefilledGradeId) {
      const grade = grades.find(g => g.id === prefilledGradeId);
      if (grade) {
        updates.gradeId = prefilledGradeId;
        preferredLevel = grade.level;
        setSelectedLevel(preferredLevel);
      }
    }

    if (prefilledTimeBlock) {
      const candidates = timeBlocks.filter(
        tb => tb.dayOfWeek === prefilledTimeBlock.dayOfWeek &&
              tb.startTime === prefilledTimeBlock.startTime &&
              tb.blockType === "CLASS"
      );
      // Prefer block matching grade level, then BOTH, then any
      const best =
        candidates.find(b => b.level === preferredLevel) ??
        candidates.find(b => b.level === "BOTH") ??
        candidates[0];
      if (best) updates.timeBlockId = best.id;
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [grades, timeBlocks]);

  const fetchData = async () => {
    try {
      const [te, su, gr, ro, tb, as] = await Promise.all([
        fetch("/api/teachers").then(r => r.json()),
        fetch("/api/subjects").then(r => r.json()),
        fetch("/api/grades").then(r => r.json()),
        fetch("/api/rooms").then(r => r.json()),
        fetch("/api/time-blocks").then(r => r.json()),
        fetch("/api/assignments").then(r => r.json()),
      ]);
      setTeachers(te);
      setSubjects(su);
      setGrades(gr);
      setRooms(ro);
      setTimeBlocks(tb.filter((b: TimeBlock) => b.blockType === "CLASS"));
      setExistingAssignments(as);
    } catch {
      toast.error("Error al cargar datos");
    }
  };

  // Cascading filters
  const activeLevel = (selectedLevel && selectedLevel !== "ALL") ? selectedLevel : "";
  const activeDay   = (selectedDay   && selectedDay   !== "ALL") ? selectedDay   : "";

  const filteredGrades = useMemo(() =>
    activeLevel ? grades.filter(g => g.level === activeLevel) : grades,
    [grades, activeLevel]);

  const filteredTimeBlocks = useMemo(() => {
    let tb = timeBlocks;
    if (activeDay) tb = tb.filter(b => b.dayOfWeek === parseInt(activeDay));
    if (activeLevel) {
      // LOW_SECONDARY grades use LOW_SECONDARY blocks specifically
      const levels =
        activeLevel === "LOW_SECONDARY" ? ["LOW_SECONDARY", "BOTH"] :
        activeLevel === "SECONDARY"     ? ["SECONDARY", "BOTH"] :
        [activeLevel, "BOTH"];
      tb = tb.filter(b => levels.includes(b.level));
    } else {
      // Deduplicate by dayOfWeek+startTime to avoid showing duplicates
      const seen = new Set<string>();
      tb = tb.filter(b => {
        const key = `${b.dayOfWeek}-${b.startTime}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return tb;
  }, [timeBlocks, activeDay, activeLevel]);

  const filteredTeachers = useMemo(() => {
    if (!activeLevel) return teachers;
    const levels = activeLevel === "LOW_SECONDARY"
      ? ["LOW_SECONDARY", "SECONDARY", "BOTH"]
      : [activeLevel, "BOTH"];
    return teachers.filter(t => levels.includes(t.level));
  }, [teachers, activeLevel]);

  // Detect duplicate subject names to show level badge
  const duplicateSubjectNames = useMemo(() => {
    const nameCount: Record<string, number> = {};
    subjects.forEach(s => { nameCount[s.name] = (nameCount[s.name] || 0) + 1; });
    return new Set(Object.keys(nameCount).filter(n => nameCount[n] > 1));
  }, [subjects]);

  const subjectLabel = (s: Subject) => {
    if (!duplicateSubjectNames.has(s.name)) return s.name;
    const lvlTag = s.level === "PRIMARY" ? "(Primaria)" : s.level === "SECONDARY" ? "(Media)" : s.level === "LOW_SECONDARY" ? "(Pre-Media)" : s.level === "BOTH" ? "(Ambos)" : s.level;
    return `${s.name} ${lvlTag}`;
  };

  const filteredSubjects = useMemo(() => {
    if (!activeLevel) return subjects;
    const levels =
      activeLevel === "LOW_SECONDARY" ? ["LOW_SECONDARY", "SECONDARY", "BOTH"] :
      [activeLevel, "BOTH"];
    return subjects.filter(s => levels.includes(s.level));
  }, [subjects, activeLevel]);

  // Conflict detection with details
  const conflicts = useMemo(() => {
    if (!formData.timeBlockId) return { teacher: false, grade: false, room: false, gradeDetails: null, roomDetails: null };
    const others = existingAssignments.filter(a => a.id !== initialData?.id);
    
    const gradeConflict = formData.gradeId ? others.find(a => a.gradeId === formData.gradeId && a.timeBlockId === formData.timeBlockId) : null;
    const roomConflict = formData.roomId ? others.find(a => a.roomId === formData.roomId && a.timeBlockId === formData.timeBlockId) : null;
    
    return {
      teacher: formData.teacherId ? others.some(a => a.teacherId === formData.teacherId && a.timeBlockId === formData.timeBlockId) : false,
      grade: !!gradeConflict,
      room: !!roomConflict,
      gradeDetails: gradeConflict,
      roomDetails: roomConflict,
    };
  }, [formData, existingAssignments, initialData]);

  const hasConflict = conflicts.teacher || conflicts.grade || conflicts.room;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherId || !formData.subjectId || !formData.gradeId || !formData.timeBlockId) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    setIsLoading(true);
    try {
      const url = initialData?.id ? `/api/assignments/${initialData.id}` : "/api/assignments";
      const method = initialData?.id ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        // Push to undo history
        const subjectName = subjects.find(s => s.id === formData.subjectId)?.name ?? "?";
        if (initialData?.id) {
          // EDIT: before = initialData snapshot, after = new formData
          pushAction({
            id: initialData.id,
            actionType: "EDIT",
            description: `Edited ${subjectName}`,
            before: {
              teacherId: initialData.teacherId ?? initialData.teacher?.id ?? "",
              subjectId: initialData.subjectId ?? initialData.subject?.id ?? "",
              gradeId: initialData.gradeId ?? initialData.grade?.id ?? null,
              roomId: initialData.roomId ?? initialData.room?.id ?? null,
              timeBlockId: initialData.timeBlockId ?? initialData.timeBlock?.id ?? "",
            },
            after: { ...formData, gradeId: formData.gradeId || null, roomId: formData.roomId || null },
          });
        } else {
          // CREATE: before = null (undo = delete), after = formData
          pushAction({
            id: result.id,
            actionType: "CREATE",
            description: `Created ${subjectName}`,
            before: null,
            after: { ...formData, gradeId: formData.gradeId || null, roomId: formData.roomId || null },
          });
        }
        if (result.status === "CONFLICT" && result.conflicts?.length > 0) {
          const msgs = (result.conflicts as Array<{description: string; severity: string}>)
            .filter(c => c.severity === "ERROR")
            .map(c => c.description);
          toast.warning(t.messages.assignmentConflict, {
            description: msgs.length > 0 ? msgs.join(" • ") : t.messages.assignmentConflictDesc,
            duration: 8000,
          });
        } else {
          toast.success(t.messages.assignmentCreated);
        }
        setIsOpen(false);
        onSuccess(result.id);
      } else {
        toast.error(result.error || t.messages.errorSaving);
      }
    } catch {
      toast.error(t.actions.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !confirm(t.actions.confirmDelete)) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${initialData.id}`, { method: "DELETE" });
      if (response.ok) {
        // Push to undo history — undo = recreate
        const subjectName = subjects.find(s => s.id === formData.subjectId)?.name ?? initialData?.subject?.name ?? "?";
        pushAction({
          id: initialData.id,
          actionType: "DELETE",
          description: `Deleted ${subjectName}`,
          before: {
            teacherId: initialData.teacherId ?? initialData.teacher?.id ?? "",
            subjectId: initialData.subjectId ?? initialData.subject?.id ?? "",
            gradeId: initialData.gradeId ?? initialData.grade?.id ?? null,
            roomId: initialData.roomId ?? initialData.room?.id ?? null,
            timeBlockId: initialData.timeBlockId ?? initialData.timeBlock?.id ?? "",
          },
          after: null,
        });
        toast.success(t.messages.assignmentDeleted);
        setIsOpen(false);
        onSuccess();
      }
    } catch {
      toast.error(t.messages.errorDeleting);
    } finally {
      setIsLoading(false);
    }
  };

  const set = (field: string, value: string) => setFormData(p => ({ ...p, [field]: value }));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> {t.schedule.title}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? t.actions.edit : t.actions.add}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          {/* Filters row */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Filtrar por nivel</Label>
              <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v); setFormData(p => ({ ...p, gradeId: "", teacherId: "", subjectId: "", timeBlockId: "" })); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos los niveles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="PRIMARY">Primaria (K-5°)</SelectItem>
                  <SelectItem value="LOW_SECONDARY">Pre-Media (6°-8°)</SelectItem>
                  <SelectItem value="SECONDARY">Media (9°-12°)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Filtrar por día</Label>
              <Select value={selectedDay} onValueChange={(v) => { setSelectedDay(v); set("timeBlockId", ""); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos los días" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los días</SelectItem>
                  {DAY_NAMES.map((d, i) => <SelectItem key={i+1} value={String(i+1)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grade + Teacher */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.nav.grades} <span className="text-red-500">*</span></Label>
              <Select value={formData.gradeId} onValueChange={(v) => set("gradeId", v)}>
                <SelectTrigger className={conflicts.grade ? "border-red-400" : ""}><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredGrades.sort((a,b) => a.name.localeCompare(b.name)).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}{g.section ? ` ${g.section}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conflicts.grade && conflicts.gradeDetails && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 
                  Grado ya tiene clase en este bloque ({(conflicts.gradeDetails as any).teacher?.name} - {(conflicts.gradeDetails as any).subject?.name})
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t.nav.teachers} <span className="text-red-500">*</span></Label>
              <Select value={formData.teacherId} onValueChange={(v) => set("teacherId", v)}>
                <SelectTrigger className={conflicts.teacher ? "border-red-400" : ""}><SelectValue placeholder="Seleccionar profesor" /></SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {filteredTeachers.sort((a,b) => a.name.localeCompare(b.name)).map(te => (
                    <SelectItem key={te.id} value={te.id}>{te.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conflicts.teacher && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Profesor ya tiene clase en este bloque</p>}
            </div>
          </div>

          {/* Subject + Room */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t.nav.subjects} <span className="text-red-500">*</span></Label>
              <Select value={formData.subjectId} onValueChange={(v) => set("subjectId", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                    <SelectItem key={s.id} value={s.id}>{subjectLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <details className="space-y-1.5">
              <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
                <span>➕ Agregar aula (opcional)</span>
              </summary>
              <div className="mt-2 space-y-1.5">
                <Select value={formData.roomId} onValueChange={(v) => set("roomId", v === "__none__" ? "" : v)}>
                  <SelectTrigger className={conflicts.room ? "border-red-400" : ""}>
                    <SelectValue placeholder="Sin aula asignada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin aula —</SelectItem>
                    {rooms.sort((a,b) => a.name.localeCompare(b.name)).map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}{r.isSpecialized ? " ★" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {conflicts.room && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Aula ya está ocupada en este bloque</p>}
              </div>
            </details>
          </div>

          {/* Time block */}
          <div className="space-y-1.5">
            <Label>{t.timeBlocks.title} <span className="text-red-500">*</span></Label>
            <Select value={formData.timeBlockId} onValueChange={(v) => set("timeBlockId", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar día y hora" /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(day => {
                  const blocks = filteredTimeBlocks.filter(b => b.dayOfWeek === day);
                  if (blocks.length === 0) return null;
                  return (
                    <div key={day}>
                      <div className="px-2 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900">{DAY_NAMES[day-1]}</div>
                      {blocks.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.startTime} – {b.endTime}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Note field */}
          <div className="space-y-1.5">
            <Label>{t.timeBlocks.note}</Label>
            <Input
              type="text"
              placeholder={t.timeBlocks.notePlaceholder}
              value={formData.note || ""}
              onChange={(e) => set("note", e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-slate-500">{t.timeBlocks.noteDescription}</p>
          </div>

          {/* Conflict summary */}
          {formData.timeBlockId && (
            <div className={`text-sm px-3 py-2 rounded-lg border ${
              hasConflict
                ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300"
                : "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300"
            }`}>
              {hasConflict ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {t.schedule.grid.conflicts}
                  </div>
                  <ul className="text-xs space-y-0.5 pl-5 list-disc">
                    {conflicts.teacher && (
                      <li>{t.validations.teacherDoubleBooking.replace("{name}",
                        teachers.find(tc => tc.id === formData.teacherId)?.name ?? "?")}</li>
                    )}
                    {conflicts.grade && conflicts.gradeDetails && (
                      <li>
                        Grade {(() => { const g = grades.find(g => g.id === formData.gradeId); return g ? `${g.name}${g.section ?? ""}` : "?"; })()} already has a class assigned in this time block.
                        {(conflicts.gradeDetails as any).teacher && (conflicts.gradeDetails as any).subject && (
                          <span className="font-semibold"> ({(conflicts.gradeDetails as any).teacher.name} - {(conflicts.gradeDetails as any).subject.name})</span>
                        )}
                      </li>
                    )}
                    {conflicts.room && conflicts.roomDetails && (
                      <li>
                        {t.validations.roomDoubleBooking.replace("{name}", rooms.find(r => r.id === formData.roomId)?.name ?? "?")}
                        {(conflicts.roomDetails as any).teacher && (conflicts.roomDetails as any).grade && (
                          <span className="font-semibold"> ({(conflicts.roomDetails as any).teacher.name} - {(conflicts.roomDetails as any).grade.name}{(conflicts.roomDetails as any).grade.section || ''})</span>
                        )}
                      </li>
                    )}
                  </ul>
                  <p className="text-xs opacity-70 pt-0.5">Puedes guardar de todas formas y resolver el conflicto después.</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {t.compare.noConflicts}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            {initialData?.id ? (
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading}>
                <Trash2 className="w-4 h-4 mr-2" /> {t.actions.delete}
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t.actions.cancel}</Button>
              <Button type="submit" disabled={isLoading} variant={hasConflict ? "outline" : "default"} className={hasConflict ? "border-amber-400 text-amber-700 hover:bg-amber-50" : ""}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {hasConflict
                  ? (initialData?.id ? "Actualizar con conflicto" : "Guardar con conflicto")
                  : (initialData?.id ? t.actions.update : t.actions.save)}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


