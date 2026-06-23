"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface Teacher {
  id: string;
  name: string;
  level: string;
}

export function TransferTeacherDialog() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [fromTeacherId, setFromTeacherId] = useState("");
  const [toTeacherId, setToTeacherId] = useState("");
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchTeachers();
    }
  }, [isOpen]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers");
      const data = await response.json();
      setTeachers(data.sort((a: Teacher, b: Teacher) => a.name.localeCompare(b.name)));
    } catch {
      toast.error("Error al cargar teachers");
    }
  };

  const handleTransfer = async () => {
    if (!fromTeacherId || !toTeacherId) {
      toast.error("Selecciona ambos teachers");
      return;
    }

    if (fromTeacherId === toTeacherId) {
      toast.error(t.schedule.transfer.sameTeacher);
      return;
    }

    const fromTeacher = teachers.find(t => t.id === fromTeacherId);
    const toTeacher = teachers.find(t => t.id === toTeacherId);

    if (!confirm(t.schedule.transfer.confirmMessage.replace("{from}", fromTeacher?.name || "").replace("{to}", toTeacher?.name || ""))) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/teachers/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTeacherId, toTeacherId })
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(`✅ ${result.transferredCount} clases transferidas`, {
          description: `De "${result.fromTeacher}" a "${result.toTeacher}"`,
          duration: 5000
        });
        setIsOpen(false);
        setFromTeacherId("");
        setToTeacherId("");
        // Recargar la página para ver los cambios
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(result.error || t.schedule.transfer.error);
      }
    } catch {
      toast.error(t.schedule.transfer.connectionError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowRightLeft className="w-4 h-4" />
          {t.schedule.transferClasses}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.schedule.transfer.title}</DialogTitle>
          <DialogDescription>
            {t.schedule.transfer.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t.schedule.transfer.from}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t.schedule.transfer.searchPlaceholder}
                value={fromSearch}
                onChange={(e) => setFromSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {fromSearch && (
              <p className="text-xs text-slate-500">
                {t.schedule.transfer.resultsFound.replace("{count}", String(teachers.filter(t => t.name.toLowerCase().includes(fromSearch.toLowerCase())).length))}
              </p>
            )}
            <Select value={fromTeacherId} onValueChange={setFromTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder={t.schedule.transfer.selectSource} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {teachers
                  .filter(t => t.name.toLowerCase().includes(fromSearch.toLowerCase()))
                  .map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.level})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <ArrowRightLeft className="w-6 h-6 text-slate-400" />
          </div>

          <div className="space-y-2">
            <Label>{t.schedule.transfer.to}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t.schedule.transfer.searchPlaceholder}
                value={toSearch}
                onChange={(e) => setToSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {toSearch && (
              <p className="text-xs text-slate-500">
                {t.schedule.transfer.resultsFound.replace("{count}", String(teachers.filter(t => t.id !== fromTeacherId && t.name.toLowerCase().includes(toSearch.toLowerCase())).length))}
              </p>
            )}
            <Select value={toTeacherId} onValueChange={setToTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder={t.schedule.transfer.selectDestination} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {teachers
                  .filter(t => t.id !== fromTeacherId && t.name.toLowerCase().includes(toSearch.toLowerCase()))
                  .map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.level})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {fromTeacherId && toTeacherId && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">⚠️ Advertencia</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Todas las clases de <strong>{teachers.find(t => t.id === fromTeacherId)?.name}</strong> serán 
                transferidas a <strong>{teachers.find(t => t.id === toTeacherId)?.name}</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            {t.actions.cancel}
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!fromTeacherId || !toTeacherId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.schedule.transfer.transferring}
              </>
            ) : (
              t.schedule.transfer.button
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
