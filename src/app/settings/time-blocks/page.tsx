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
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Clock, Trash2, Pencil } from "lucide-react";

interface TimeBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration?: string | null;
  level: string;
  blockType: string;
}

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
];

export default function TimeBlocksPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== "ADMIN") { router.replace("/"); return; }
    fetchBlocks();
  }, [currentUser]);

  const fetchBlocks = async () => {
    try {
      const response = await fetch("/api/time-blocks");
      const data = await response.json();
      setBlocks(data);
    } catch (error) {
      toast.error("Error al cargar los bloques horarios");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      dayOfWeek: formData.get("dayOfWeek"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      duration: formData.get("duration") || null,
      level: formData.get("level"),
      blockType: formData.get("blockType"),
    };

    try {
      const response = await fetch("/api/time-blocks", {
        method: editingBlock ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBlock ? { ...data, id: editingBlock.id } : data),
      });

      if (response.ok) {
        toast.success(editingBlock ? "Bloque actualizado" : "Bloque creado correctamente");
        setIsOpen(false);
        setEditingBlock(null);
        fetchBlocks();
      } else {
        toast.error(editingBlock ? "Error al actualizar" : "Error al crear el bloque");
      }
    } catch (error) {
      toast.error("Error en la petición");
    }
  };

  const deleteBlock = async (id: string) => {
    if (!confirm("¿Eliminar este bloque horario?")) return;
    try {
      const response = await fetch(`/api/time-blocks?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Bloque eliminado");
        fetchBlocks();
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const getDayLabel = (day: number) => t.timeBlocks.days[day - 1] || day;

  const LEVEL_GROUPS = [
    { key: "PRIMARY",   label: "🏫 Primaria",        color: "border-green-400",  badge: "bg-green-100 text-green-800" },
    { key: "SECONDARY", label: "🎓 Secundaria",       color: "border-blue-400",   badge: "bg-blue-100 text-blue-800" },
    { key: "BOTH",      label: "🔄 Ambos niveles",    color: "border-purple-400", badge: "bg-purple-100 text-purple-800" },
  ];

  const blockTypeColor = (bt: string) =>
    bt === "CLASS"        ? "bg-blue-100 text-blue-700" :
    bt === "BREAK"        ? "bg-orange-100 text-orange-700" :
    bt === "LUNCH"        ? "bg-yellow-100 text-yellow-700" :
    bt === "REGISTRATION" ? "bg-slate-100 text-slate-600" :
    bt === "HOMEROOM"     ? "bg-teal-100 text-teal-700" :
    "bg-slate-100 text-slate-700";

  const BlockTable = ({ levelBlocks }: { levelBlocks: TimeBlock[] }) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          <TableHead className="w-[110px]">{t.timeBlocks.day}</TableHead>
          <TableHead className="w-[140px]">Hora</TableHead>
          <TableHead>{t.timeBlocks.type}</TableHead>
          <TableHead className="w-[100px] text-right">{t.actions.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {levelBlocks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
              {t.actions.noData}
            </TableCell>
          </TableRow>
        ) : (
          levelBlocks.map((block) => (
            <TableRow key={block.id} className="hover:bg-slate-50/50">
              <TableCell className="font-medium">{getDayLabel(block.dayOfWeek)}</TableCell>
              <TableCell className="font-mono text-sm">{block.startTime} – {block.endTime}</TableCell>
              <TableCell>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${blockTypeColor(block.blockType)}`}>
                  {t.timeBlocks.types[block.blockType as keyof typeof t.timeBlocks.types]}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-amber-500 hover:text-amber-700"
                    onClick={() => { setEditingBlock(block); setIsOpen(true); }}
                    title={t.actions.edit}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700"
                    onClick={() => deleteBlock(block.id)}
                    title={t.actions.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.timeBlocks.title}</h1>
          <p className="text-muted-foreground">
            {t.timeBlocks.subtitle}
          </p>
        </div>
        <Dialog 
          open={isOpen} 
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingBlock(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Clock className="w-4 h-4" />
              {t.timeBlocks.newBlock}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBlock ? t.timeBlocks.editBlock : t.timeBlocks.newBlock}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dayOfWeek">{t.timeBlocks.day}</Label>
                  <Select name="dayOfWeek" defaultValue={editingBlock?.dayOfWeek.toString() || "1"}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.timeBlocks.day} />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {t.timeBlocks.days[day.value - 1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">{t.timeBlocks.start}</Label>
                  <Input 
                    id="startTime" 
                    name="startTime" 
                    type="time" 
                    required 
                    defaultValue={editingBlock?.startTime}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input 
                    id="endTime" 
                    name="endTime" 
                    type="time" 
                    required 
                    defaultValue={editingBlock?.endTime}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">{t.timeBlocks.duration} (optional)</Label>
                  <Select name="duration" defaultValue={editingBlock?.duration || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.timeBlocks.duration} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="THIRTY">{t.subjects.durations.THIRTY}</SelectItem>
                      <SelectItem value="FORTYFIVE">{t.subjects.durations.FORTYFIVE}</SelectItem>
                      <SelectItem value="SIXTY">{t.subjects.durations.SIXTY}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">{t.timeBlocks.level}</Label>
                  <Select name="level" defaultValue={editingBlock?.level || "BOTH"}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.timeBlocks.level} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRIMARY">{t.teachers.levels.PRIMARY}</SelectItem>
                      <SelectItem value="LOW_SECONDARY">{t.teachers.levels.LOW_SECONDARY}</SelectItem>
                      <SelectItem value="SECONDARY">{t.teachers.levels.SECONDARY}</SelectItem>
                      <SelectItem value="BOTH">{t.teachers.levels.BOTH}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blockType">{t.timeBlocks.type}</Label>
                <Select name="blockType" defaultValue={editingBlock?.blockType || "CLASS"}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.timeBlocks.type} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS">{t.timeBlocks.types.CLASS}</SelectItem>
                    <SelectItem value="REGISTRATION">{t.timeBlocks.types.REGISTRATION}</SelectItem>
                    <SelectItem value="HOMEROOM">{t.timeBlocks.types.HOMEROOM}</SelectItem>
                    <SelectItem value="BREAK">{t.timeBlocks.types.BREAK}</SelectItem>
                    <SelectItem value="LUNCH">{t.timeBlocks.types.LUNCH}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsOpen(false);
                    setEditingBlock(null);
                  }}
                >
                  {t.actions.cancel}
                </Button>
                <Button type="submit">
                  {editingBlock ? t.actions.update : t.actions.save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t.actions.loading}</div>
      ) : (
        <div className="space-y-6">
          {LEVEL_GROUPS.map(({ key, label, color, badge }) => {
            const levelBlocks = blocks.filter((b) => b.level === key);
            return (
              <div key={key} className={`border-l-4 ${color} rounded-lg bg-white shadow-sm overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-base">{label}</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                      {levelBlocks.length} bloques
                    </span>
                  </div>
                </div>
                <BlockTable levelBlocks={levelBlocks} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
