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
import { toast } from "sonner";
import { Plus, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

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
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function AssignmentForm({ initialData, onSuccess, trigger }: AssignmentFormProps) {
  const { t } = useLanguage();
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
  const [selectedDay, setSelectedDay] = useState<string>(initialData?.timeBlock?.dayOfWeek?.toString() || "");
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    teacherId: initialData?.teacherId || "",
    subjectId: initialData?.subjectId || "",
    gradeId: initialData?.gradeId || "",
    roomId: initialData?.roomId || "",   // optional
    timeBlockId: initialData?.timeBlockId || "",
  });

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

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
      const tlevel = activeLevel === "LOW_SECONDARY" ? "SECONDARY" : activeLevel;
      tb = tb.filter(b => b.level === tlevel || b.level === "BOTH");
    } else {
      // Deduplicate by dayOfWeek+startTime to avoid showing PRIMARY and SECONDARY duplicates
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

  const filteredSubjects = useMemo(() => {
    if (!activeLevel) return subjects;
    const tlevel = activeLevel === "LOW_SECONDARY" ? "SECONDARY" : activeLevel;
    return subjects.filter(s => s.level === tlevel || s.level === "BOTH");
  }, [subjects, activeLevel]);

  // Conflict detection
  const conflicts = useMemo(() => {
    if (!formData.timeBlockId) return { teacher: false, grade: false, room: false };
    const others = existingAssignments.filter(a => a.id !== initialData?.id);
    return {
      teacher: formData.teacherId ? others.some(a => a.teacherId === formData.teacherId && a.timeBlockId === formData.timeBlockId) : false,
      grade:   formData.gradeId   ? others.some(a => a.gradeId   === formData.gradeId   && a.timeBlockId === formData.timeBlockId) : false,
      room:    formData.roomId    ? others.some(a => a.roomId     === formData.roomId    && a.timeBlockId === formData.timeBlockId) : false,
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
        if (result.status === "CONFLICT") {
          toast.warning(t.messages.assignmentConflict, { description: t.messages.assignmentConflictDesc });
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
              <Label>{t.nav.grades}</Label>
              <Select value={formData.gradeId} onValueChange={(v) => set("gradeId", v)}>
                <SelectTrigger className={conflicts.grade ? "border-red-400" : ""}><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                <SelectContent>
                  {filteredGrades.sort((a,b) => a.name.localeCompare(b.name)).map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}{g.section ? ` ${g.section}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conflicts.grade && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Grado ya tiene clase en este bloque</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t.nav.teachers}</Label>
              <Select value={formData.teacherId} onValueChange={(v) => set("teacherId", v)}>
                <SelectTrigger className={conflicts.teacher ? "border-red-400" : ""}><SelectValue placeholder="Seleccionar profesor" /></SelectTrigger>
                <SelectContent>
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
              <Label>{t.nav.subjects}</Label>
              <Select value={formData.subjectId} onValueChange={(v) => set("subjectId", v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
                <SelectContent>
                  {filteredSubjects.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                {t.nav.rooms}
                <span className="text-xs text-slate-400 font-normal">(opcional)</span>
              </Label>
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
          </div>

          {/* Time block */}
          <div className="space-y-1.5">
            <Label>{t.timeBlocks.title}</Label>
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

          {/* Conflict summary */}
          {formData.timeBlockId && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${hasConflict ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
              {hasConflict
                ? <><AlertTriangle className="w-4 h-4 shrink-0" /> Hay conflictos — aun así puedes guardar</>
                : <><CheckCircle2 className="w-4 h-4 shrink-0" /> Sin conflictos detectados</>}
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
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {initialData?.id ? t.actions.update : t.actions.save}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


