"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Bell, Play, Plus, Settings, Wifi, WifiOff, Loader2, Pencil, Trash2 } from "lucide-react";

interface BellSchedule {
  id: string;
  dayOfWeek: number;
  time: string;
  duration: number;
  pattern: string;
  level: string;
  active: boolean;
}

const DAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
];

export default function BellControlPage() {
  const { t } = useLanguage();
  const [schedules, setSchedules] = useState<BellSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BellSchedule | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch("/api/bell/schedule");
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      toast.error("Error al cargar la programación del timbre");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTrigger = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch("/api/bell/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: 2000, pattern: "SINGLE" }),
      });
      if (response.ok) {
        toast.success("Señal de timbre enviada");
      } else {
        toast.error("Error al enviar señal");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setIsTriggering(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      dayOfWeek: formData.get("dayOfWeek"),
      time: formData.get("time"),
      duration: formData.get("duration"),
      pattern: formData.get("pattern"),
      level: formData.get("level"),
    };

    try {
      const response = await fetch("/api/bell/schedule", {
        method: editingSchedule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSchedule ? { ...data, id: editingSchedule.id } : data),
      });

      if (response.ok) {
        toast.success(editingSchedule ? "Horario actualizado" : "Horario de timbre agregado");
        setIsScheduleOpen(false);
        setEditingSchedule(null);
        fetchSchedules();
      } else {
        toast.error("Error al guardar");
      }
    } catch (error) {
      toast.error("Error en la petición");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("¿Eliminar este timbre programado?")) return;
    try {
      const response = await fetch(`/api/bell/schedule?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Horario eliminado");
        fetchSchedules();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.bell.title}</h1>
          <p className="text-muted-foreground">
            {t.bell.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
            <Wifi className="w-4 h-4" />
            {t.bell.connected}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{t.bell.manual}</CardTitle>
            <CardDescription>{t.bell.manualDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full h-24 text-xl font-bold gap-3 bg-red-600 hover:bg-red-700"
              onClick={handleManualTrigger}
              disabled={isTriggering}
            >
              {isTriggering ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Bell className="w-8 h-8" />
                  {t.bell.ringNow}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t.bell.ringWarning}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t.bell.weekly}</CardTitle>
              <CardDescription>{t.bell.weeklyDesc}</CardDescription>
            </div>
            <Dialog 
              open={isScheduleOpen} 
              onOpenChange={(open) => {
                setIsScheduleOpen(open);
                if (!open) setEditingSchedule(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t.bell.newSchedule}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSchedule ? t.bell.editSchedule : t.bell.newSchedule}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddSchedule} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.timeBlocks.day}</Label>
                      <Select name="dayOfWeek" defaultValue={editingSchedule?.dayOfWeek.toString() || "1"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DAYS.map(d => (
                            <SelectItem key={d.value} value={d.value.toString()}>
                              {t.timeBlocks.days[d.value - 1]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.timeBlocks.start}</Label>
                      <Input 
                        name="time" 
                        type="time" 
                        required 
                        defaultValue={editingSchedule?.time}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.bell.duration}</Label>
                      <Input 
                        name="duration" 
                        type="number" 
                        defaultValue={editingSchedule?.duration || "2000"} 
                        step="500" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.bell.pattern}</Label>
                      <Select name="pattern" defaultValue={editingSchedule?.pattern || "SINGLE"}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE">{t.bell.patterns.SINGLE}</SelectItem>
                          <SelectItem value="DOUBLE">{t.bell.patterns.DOUBLE}</SelectItem>
                          <SelectItem value="TRIPLE">{t.bell.patterns.TRIPLE}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.bell.level}</Label>
                    <Select name="level" defaultValue={editingSchedule?.level || "BOTH"}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIMARY">{t.teachers.levels.PRIMARY}</SelectItem>
                        <SelectItem value="SECONDARY">{t.teachers.levels.SECONDARY}</SelectItem>
                        <SelectItem value="BOTH">{t.teachers.levels.BOTH}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsScheduleOpen(false);
                        setEditingSchedule(null);
                      }}
                    >
                      {t.actions.cancel}
                    </Button>
                    <Button type="submit">
                      {editingSchedule ? t.actions.update : t.actions.save}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.timeBlocks.day}</TableHead>
                  <TableHead>{t.timeBlocks.start}</TableHead>
                  <TableHead>{t.timeBlocks.duration}</TableHead>
                  <TableHead>{t.bell.pattern}</TableHead>
                  <TableHead>{t.bell.level}</TableHead>
                  <TableHead className="text-right">{t.actions.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4">{t.actions.loading}</TableCell></TableRow>
                ) : schedules.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">{t.actions.noData}</TableCell></TableRow>
                ) : (
                  schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{t.timeBlocks.days[s.dayOfWeek - 1]}</TableCell>
                      <TableCell>{s.time}</TableCell>
                      <TableCell>{s.duration / 1000}s</TableCell>
                      <TableCell>{t.bell.patterns[s.pattern as keyof typeof t.bell.patterns]}</TableCell>
                      <TableCell>{t.teachers.levels[s.level as keyof typeof t.teachers.levels]}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingSchedule(s);
                              setIsScheduleOpen(true);
                            }}
                            title={t.actions.edit}
                          >
                            <Pencil className="h-4 w-4 text-amber-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteSchedule(s.id)}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
