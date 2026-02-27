"use client";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface Teacher { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Grade { id: string; name: string; section: string | null; }
interface Room { id: string; name: string; }
interface TimeBlock { id: string; dayOfWeek: number; startTime: string; blockType: string; }

interface AssignmentFormProps {
  initialData?: any;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function AssignmentForm({ initialData, onSuccess, trigger }: AssignmentFormProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data for selects
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    teacherId: initialData?.teacherId || "",
    subjectId: initialData?.subjectId || "",
    gradeId: initialData?.gradeId || "",
    roomId: initialData?.roomId || "",
    timeBlockId: initialData?.timeBlockId || "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    try {
      const [t, s, g, r, tb] = await Promise.all([
        fetch("/api/teachers").then(res => res.json()),
        fetch("/api/subjects").then(res => res.json()),
        fetch("/api/grades").then(res => res.json()),
        fetch("/api/rooms").then(res => res.json()),
        fetch("/api/time-blocks").then(res => res.json()),
      ]);
      setTeachers(t);
      setSubjects(s);
      setGrades(g);
      setRooms(r);
      setTimeBlocks(tb.filter((b: any) => b.blockType === "CLASS"));
    } catch (error) {
      toast.error("Error al cargar datos del formulario");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = initialData?.id 
        ? `/api/assignments/${initialData.id}` 
        : "/api/assignments";
      
      const method = initialData?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.status === "CONFLICT") {
          toast.warning(t.messages.assignmentConflict, {
            description: t.messages.assignmentConflictDesc,
          });
        } else {
          toast.success(t.messages.assignmentCreated);
        }
        setIsOpen(false);
        onSuccess();
      } else {
        toast.error(result.error || t.messages.errorSaving);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !confirm(t.actions.confirmDelete)) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${initialData.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(t.messages.assignmentDeleted);
        setIsOpen(false);
        onSuccess();
      }
    } catch (error) {
      toast.error(t.messages.errorDeleting);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayLabel = (day: number) => {
    return t.timeBlocks.days[day - 1];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> {t.schedule.title}</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? t.actions.edit : t.actions.add}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.nav.teachers}</Label>
              <Select 
                value={formData.teacherId} 
                onValueChange={(v) => setFormData({...formData, teacherId: v})}
              >
                <SelectTrigger><SelectValue placeholder={t.schedule.select.replace('{type}', '')} /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.nav.subjects}</Label>
              <Select 
                value={formData.subjectId} 
                onValueChange={(v) => setFormData({...formData, subjectId: v})}
              >
                <SelectTrigger><SelectValue placeholder={t.schedule.select.replace('{type}', '')} /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.nav.grades}</Label>
              <Select 
                value={formData.gradeId} 
                onValueChange={(v) => setFormData({...formData, gradeId: v})}
              >
                <SelectTrigger><SelectValue placeholder={t.schedule.select.replace('{type}', '')} /></SelectTrigger>
                <SelectContent>
                  {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}{g.section}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.nav.rooms}</Label>
              <Select 
                value={formData.roomId} 
                onValueChange={(v) => setFormData({...formData, roomId: v})}
              >
                <SelectTrigger><SelectValue placeholder={t.schedule.select.replace('{type}', '')} /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.timeBlocks.title}</Label>
            <Select 
              value={formData.timeBlockId} 
              onValueChange={(v) => setFormData({...formData, timeBlockId: v})}
            >
              <SelectTrigger><SelectValue placeholder={t.schedule.select.replace('{type}', '')} /></SelectTrigger>
              <SelectContent>
                {timeBlocks.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {getDayLabel(b.dayOfWeek)} - {b.startTime}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center pt-6">
            {initialData?.id ? (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
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
