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
import { Plus, GraduationCap, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Subject { id: string; name: string; }

interface Grade {
  id: string;
  name: string;
  section: string | null;
  level: string;
  studentCount: number;
  subjectCount: number;
  subjects: { subject: Subject }[];
}

export default function GradesPage() {
  const { t } = useLanguage();
  const { canManage } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);
  const [selectedGradeId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchGrades();
    fetchAllSubjects();
  }, []);

  const fetchAllSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      setAllSubjects(data);
    } catch (error) {
      toast.error(t.messages.errorFetching);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch("/api/grades");
      const data = await response.json();
      setGrades(data);
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
      section: formData.get("section") || null,
      level: formData.get("level"),
      studentCount: formData.get("studentCount"),
      subjectCount: formData.get("subjectCount"),
    };

    try {
      const response = await fetch("/api/grades", {
        method: editingGrade ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGrade ? { ...data, id: editingGrade.id } : data),
      });

      if (response.ok) {
        toast.success(editingGrade ? t.messages.gradeUpdated : t.messages.gradeCreated);
        setIsOpen(false);
        setEditingGrade(null);
        fetchGrades();
      } else {
        toast.error(t.messages.errorSaving);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.actions.confirmDelete)) return;
    try {
      const response = await fetch(`/api/grades?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(t.messages.gradeDeleted);
        fetchGrades();
      } else {
        toast.error(t.messages.errorDeleting);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    }
  };

  const handleLinkSubject = async (subjectId: string) => {
    if (!selectedGradeId) return;
    try {
      const response = await fetch("/api/grade-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId: selectedGradeId, subjectId }),
      });
      if (response.ok) {
        toast.success(t.messages.linkSuccess);
        fetchGrades();
      }
    } catch (error) {
      toast.error(t.messages.errorSaving);
    }
  };

  const handleUnlinkSubject = async (subjectId: string) => {
    if (!selectedGradeId) return;
    try {
      const response = await fetch(`/api/grade-subjects?gradeId=${selectedGradeId}&subjectId=${subjectId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(t.messages.unlinkSuccess);
        fetchGrades();
      }
    } catch (error) {
      toast.error(t.messages.errorDeleting);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.grades.title}</h1>
          <p className="text-muted-foreground">
            {t.grades.subtitle}
          </p>
        </div>
        {canManage && <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingGrade(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <GraduationCap className="w-4 h-4" />
              {t.grades.newGrade}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGrade ? t.grades.editGrade : t.grades.newGrade}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.grades.name}</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="Ej: 9, K, 10" 
                    required 
                    defaultValue={editingGrade?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section">{t.grades.section}</Label>
                  <Input 
                    id="section" 
                    name="section" 
                    placeholder="Ej: A, B, C" 
                    defaultValue={editingGrade?.section || ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">{t.grades.level}</Label>
                <Select name="level" defaultValue={editingGrade?.level || "PRIMARY"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY">{t.teachers.levels.PRIMARY}</SelectItem>
                    <SelectItem value="LOW_SECONDARY">{t.teachers.levels.LOW_SECONDARY}</SelectItem>
                    <SelectItem value="SECONDARY">{t.teachers.levels.SECONDARY}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentCount">{t.grades.students}</Label>
                  <Input 
                    id="studentCount" 
                    name="studentCount" 
                    type="number" 
                    defaultValue={editingGrade?.studentCount || "25"} 
                    min="1" 
                    max="50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectCount">{t.grades.subjectCount}</Label>
                  <Input 
                    id="subjectCount" 
                    name="subjectCount" 
                    type="number" 
                    defaultValue={editingGrade?.subjectCount || "10"} 
                    min="1" 
                    max="20" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false);
                    setEditingGrade(null);
                  }}
                >
                  {t.actions.cancel}
                </Button>
                <Button type="submit">
                  {editingGrade ? t.actions.update : t.actions.save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="border rounded-lg bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.grades.name}</TableHead>
              <TableHead>{t.grades.section}</TableHead>
              <TableHead>{t.grades.level}</TableHead>
              <TableHead>{t.grades.assignedSubjects}</TableHead>
              <TableHead className="text-right">{t.grades.students}</TableHead>
              <TableHead className="text-right">{t.actions.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t.actions.loading}
                </TableCell>
              </TableRow>
            ) : grades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t.actions.noData}
                </TableCell>
              </TableRow>
            ) : (
              grades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{grade.name}</TableCell>
                  <TableCell>{grade.section || "-"}</TableCell>
                  <TableCell>{t.teachers.levels[grade.level as keyof typeof t.teachers.levels]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {grade.subjects.map((s) => (
                        <span key={s.subject.id} className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {s.subject.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{grade.studentCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canManage && <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedId(grade.id);
                          setIsLinkingOpen(true);
                        }}
                        title={t.grades.linkSubjects}
                      >
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingGrade(grade);
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
                        onClick={() => handleDelete(grade.id)}
                        title={t.actions.delete}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      </>}
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
            <DialogTitle>{t.grades.linkSubjects}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t.grades.linkSubjectsDesc}
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
              {allSubjects.map((subject) => {
                const isLinked = grades
                  .find((g) => g.id === selectedGradeId)
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
