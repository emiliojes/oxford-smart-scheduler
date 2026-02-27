"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { Plus, UserPlus, BookOpen, Pencil, Trash2 } from "lucide-react";

interface Subject { id: string; name: string; }

interface Teacher {
  id: string;
  name: string;
  email: string | null;
  level: string;
  primaryType: string | null;
  maxWeeklyHours: number;
  subjects: { subject: Subject }[];
}

export default function TeachersPage() {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);
  const [selectedTeacherId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
    fetchAllSubjects();
  }, []);

  const fetchAllSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      setAllSubjects(data);
    } catch (error) {
      toast.error(t.messages.errorFetching);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers");
      const data = await response.json();
      setTeachers(data);
    } catch (error) {
      toast.error(t.messages.errorFetching);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      level: formData.get("level"),
      primaryType: formData.get("primaryType") || null,
      maxWeeklyHours: formData.get("maxWeeklyHours"),
    };

    try {
      const response = await fetch("/api/teachers", {
        method: editingTeacher ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTeacher ? { ...data, id: editingTeacher.id } : data),
      });

      if (response.ok) {
        toast.success(editingTeacher ? t.messages.teacherUpdated : t.messages.teacherCreated);
        setIsOpen(false);
        setEditingTeacher(null);
        fetchTeachers();
      } else {
        const result = await response.json();
        const errorMessage = result.error && t.messages[result.error as keyof typeof t.messages] 
          ? t.messages[result.error as keyof typeof t.messages] 
          : t.messages.errorSaving;
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.actions.confirmDelete)) return;
    
    try {
      const response = await fetch(`/api/teachers?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t.messages.teacherDeleted);
        fetchTeachers();
      } else {
        toast.error(t.messages.errorDeleting);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    }
  };

  const handleLinkSubject = async (subjectId: string) => {
    if (!selectedTeacherId) return;
    try {
      const response = await fetch("/api/teacher-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: selectedTeacherId, subjectId }),
      });
      if (response.ok) {
        toast.success(t.messages.linkSuccess);
        fetchTeachers();
      }
    } catch (error) {
      toast.error(t.messages.errorSaving);
    }
  };

  const handleUnlinkSubject = async (subjectId: string) => {
    if (!selectedTeacherId) return;
    try {
      const response = await fetch(`/api/teacher-subjects?teacherId=${selectedTeacherId}&subjectId=${subjectId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(t.messages.unlinkSuccess);
        fetchTeachers();
      }
    } catch (error) {
      toast.error(t.messages.errorDeleting);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.teachers.title}</h1>
          <p className="text-muted-foreground">
            {t.teachers.subtitle}
          </p>
        </div>
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingTeacher(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              {t.teachers.newTeacher}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTeacher ? t.teachers.editTeacher : t.teachers.newTeacher}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.teachers.name}</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ej: Emilio Nuñez" 
                  required 
                  defaultValue={editingTeacher?.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.teachers.email}</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="ejemplo@oxford.edu.pa" 
                  defaultValue={editingTeacher?.email || ""}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">{t.teachers.level}</Label>
                  <Select name="level" defaultValue={editingTeacher?.level || "BOTH"}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.teachers.selectLevel} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIMARY">{t.teachers.levels.PRIMARY}</SelectItem>
                      <SelectItem value="LOW_SECONDARY">{t.teachers.levels.LOW_SECONDARY}</SelectItem>
                      <SelectItem value="SECONDARY">{t.teachers.levels.SECONDARY}</SelectItem>
                      <SelectItem value="BOTH">{t.teachers.levels.BOTH}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxWeeklyHours">{t.teachers.maxHours}</Label>
                  <Input 
                    id="maxWeeklyHours" 
                    name="maxWeeklyHours" 
                    type="number" 
                    defaultValue={editingTeacher?.maxWeeklyHours || "27"} 
                    min="1" 
                    max="40" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryType">{t.teachers.type}</Label>
                <Select name="primaryType" defaultValue={editingTeacher?.primaryType || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.teachers.selectType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COUNSELOR">{t.teachers.primaryTypes.COUNSELOR}</SelectItem>
                    <SelectItem value="SPECIALIST">{t.teachers.primaryTypes.SPECIALIST}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false);
                    setEditingTeacher(null);
                  }}
                >
                  {t.actions.cancel}
                </Button>
                <Button type="submit">
                  {editingTeacher ? t.actions.update : t.actions.save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.teachers.name}</TableHead>
              <TableHead>{t.subjects.level}</TableHead>
              <TableHead>{t.teachers.subjects}</TableHead>
              <TableHead className="text-right">{t.teachers.maxHours}</TableHead>
              <TableHead className="text-right">{t.actions.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.actions.loading}
                </TableCell>
              </TableRow>
            ) : teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.actions.noData}
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>{t.teachers.levels[teacher.level as keyof typeof t.teachers.levels]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map((s) => (
                        <span key={s.subject.id} className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {s.subject.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{teacher.maxWeeklyHours}h</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedId(teacher.id);
                          setIsLinkingOpen(true);
                        }}
                        title={t.teachers.linkSubjects}
                      >
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingTeacher(teacher);
                          setIsOpen(true);
                        }}
                        title={t.actions.edit}
                      >
                        <Pencil className="h-4 w-4 text-amber-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleDelete(teacher.id)}
                        title={t.actions.delete}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isLinkingOpen} onOpenChange={setIsLinkingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.teachers.linkSubjects}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t.teachers.linkSubjectsDesc}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
              {allSubjects.map((subject) => {
                const isLinked = teachers
                  .find((t) => t.id === selectedTeacherId)
                  ?.subjects.some((s) => s.subject.id === subject.id);
                return (
                  <div 
                    key={subject.id} 
                    className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm truncate mr-2">{subject.name}</span>
                    <Button
                      size="sm"
                      variant={isLinked ? "destructive" : "outline"}
                      className="h-7 text-[10px]"
                      onClick={() => isLinked ? handleUnlinkSubject(subject.id) : handleLinkSubject(subject.id)}
                    >
                      {isLinked ? t.actions.delete : t.actions.add}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
