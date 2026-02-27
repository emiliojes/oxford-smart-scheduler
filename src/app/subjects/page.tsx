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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { BookPlus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface Subject {
  id: string;
  name: string;
  level: string;
  weeklyFrequency: number;
  defaultDuration: string;
  requiresSpecialRoom: boolean;
  specialRoomType: string | null;
}

export default function SubjectsPage() {
  const { t } = useLanguage();
  const { canManage } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [requiresSpecialRoom, setRequiresSpecialRoom] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch("/api/subjects");
      const data = await response.json();
      setSubjects(data);
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
      level: formData.get("level"),
      weeklyFrequency: formData.get("weeklyFrequency"),
      defaultDuration: formData.get("defaultDuration"),
      requiresSpecialRoom: requiresSpecialRoom,
      specialRoomType: formData.get("specialRoomType") || null,
    };

    try {
      const response = await fetch("/api/subjects", {
        method: editingSubject ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSubject ? { ...data, id: editingSubject.id } : data),
      });

      if (response.ok) {
        toast.success(editingSubject ? t.messages.subjectUpdated : t.messages.subjectCreated);
        setIsOpen(false);
        setEditingSubject(null);
        fetchSubjects();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t.messages.errorSaving);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.actions.confirmDelete)) return;
    try {
      const response = await fetch(`/api/subjects?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success(t.messages.subjectDeleted);
        fetchSubjects();
      } else {
        toast.error(t.messages.errorDeleting);
      }
    } catch (error) {
      toast.error(t.actions.connectionError);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.subjects.title}</h1>
          <p className="text-muted-foreground">
            {t.subjects.subtitle}
          </p>
        </div>
        {canManage && <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingSubject(null);
              setRequiresSpecialRoom(false);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <BookPlus className="w-4 h-4" />
              {t.subjects.newSubject}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? t.subjects.editSubject : t.subjects.newSubject}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.subjects.name}</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ej: Computing, English, Maths" 
                  required 
                  defaultValue={editingSubject?.name}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">{t.subjects.level}</Label>
                  <Select name="level" defaultValue={editingSubject?.level || "BOTH"}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.subjects.selectLevel} />
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
                  <Label htmlFor="weeklyFrequency">{t.subjects.frequency}</Label>
                  <Input 
                    id="weeklyFrequency" 
                    name="weeklyFrequency" 
                    type="number" 
                    defaultValue={editingSubject?.weeklyFrequency || "3"} 
                    min="1" 
                    max="10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultDuration">{t.subjects.duration}</Label>
                <Select name="defaultDuration" defaultValue={editingSubject?.defaultDuration || "SIXTY"}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.subjects.selectDuration} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THIRTY">{t.subjects.durations.THIRTY}</SelectItem>
                    <SelectItem value="FORTYFIVE">{t.subjects.durations.FORTYFIVE}</SelectItem>
                    <SelectItem value="SIXTY">{t.subjects.durations.SIXTY}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Switch 
                  id="requiresSpecialRoom" 
                  checked={requiresSpecialRoom} 
                  onCheckedChange={setRequiresSpecialRoom} 
                />
                <Label htmlFor="requiresSpecialRoom">{t.subjects.specialRoom}</Label>
              </div>
              {requiresSpecialRoom && (
                <div className="space-y-2">
                  <Label htmlFor="specialRoomType">{t.subjects.roomType}</Label>
                  <Input 
                    id="specialRoomType" 
                    name="specialRoomType" 
                    placeholder="Ej: Computing, Lab, Gym" 
                    required={requiresSpecialRoom} 
                    defaultValue={editingSubject?.specialRoomType || ""}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false);
                    setEditingSubject(null);
                  }}
                >
                  {t.actions.cancel}
                </Button>
                <Button type="submit">
                  {editingSubject ? t.actions.update : t.actions.save}
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
              <TableHead>{t.subjects.title}</TableHead>
              <TableHead>{t.subjects.level}</TableHead>
              <TableHead>{t.subjects.frequency}</TableHead>
              <TableHead>{t.subjects.duration}</TableHead>
              <TableHead>{t.rooms.specialized}</TableHead>
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
            ) : subjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t.actions.noData}
                </TableCell>
              </TableRow>
            ) : (
              subjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>{t.teachers.levels[subject.level as keyof typeof t.teachers.levels]}</TableCell>
                  <TableCell>{subject.weeklyFrequency}h/sem</TableCell>
                  <TableCell>
                    {t.subjects.durations[subject.defaultDuration as keyof typeof t.subjects.durations]}
                  </TableCell>
                  <TableCell>{subject.requiresSpecialRoom ? subject.specialRoomType : "No"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canManage && <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingSubject(subject);
                          setRequiresSpecialRoom(subject.requiresSpecialRoom);
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
                        onClick={() => handleDelete(subject.id)}
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
    </div>
  );
}
