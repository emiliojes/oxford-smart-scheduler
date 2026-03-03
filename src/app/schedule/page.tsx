"use client";

import { useEffect, useRef, useState } from "react";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Printer, Download, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exportToPDF, exportToWord, exportToImage } from "@/lib/export-utils";
import { AssignmentForm } from "@/components/AssignmentForm";

export default function ScheduleViewPage() {
  const { t, language } = useLanguage();
  const { user: currentUser, canManage } = useAuth();
  const isTeacherView = currentUser?.role === "TEACHER" && !!currentUser?.teacherId;

  const [viewType, setViewType] = useState<"teacher" | "grade" | "room">("teacher");
  const [selectedId, setSelectedId] = useState<string>("");
  const [options, setOptions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const [assignments, setAssignments] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [teacherName, setTeacherName] = useState<string>("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    fetchTimeBlocks();
    if (isTeacherView) {
      const tid = currentUser!.teacherId!;
      setSelectedId(tid);
      fetchAssignments(tid);
      // Fetch teacher name for display and print header
      fetch(`/api/teachers`)
        .then(r => r.json())
        .then((list: any[]) => {
          const found = list.find((t: any) => t.id === tid);
          if (found) setTeacherName(found.name);
        })
        .catch(() => {});
    } else {
      fetchOptions();
    }
  }, [viewType, isTeacherView]);

  useEffect(() => {
    if (selectedId && !isTeacherView) fetchAssignments();
  }, [selectedId]);

  const fetchOptions = async () => {
    try {
      const endpoint = viewType === "teacher" ? "teachers" : viewType === "grade" ? "grades" : "rooms";
      const response = await fetch(`/api/${endpoint}`);
      const data = await response.json();
      setOptions(data);
      if (data.length > 0) setSelectedId(data[0].id);
    } catch (error) {
      toast.error("Error al cargar opciones");
    }
  };

  const fetchTimeBlocks = async () => {
    try {
      const response = await fetch("/api/time-blocks");
      const data = await response.json();
      setTimeBlocks(data);
    } catch (error) {
      toast.error("Error al cargar bloques");
    }
  };

  const fetchAssignments = async (overrideTeacherId?: string) => {
    setIsLoading(true);
    try {
      let url: string;
      if (isTeacherView) {
        // Always filter by this user's linked teacher ID
        url = `/api/assignments?teacherId=${overrideTeacherId ?? currentUser!.teacherId}`;
      } else {
        const queryParam = viewType === "teacher" ? "teacherId" : viewType === "grade" ? "gradeId" : "roomId";
        url = `/api/assignments?${queryParam}=${selectedId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      toast.error("Error al cargar horarios");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate teaching hours for display in title
  const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
  const teachingAssignments = assignments.filter((a: any) =>
    a.timeBlock.blockType === "CLASS" && !DUTY_KEYWORDS.some(k => a.subject.name.includes(k))
  );
  // Deduplicate by (dayOfWeek, startTime) — a slot shared by 2 grades only counts once
  const uniqueTeachingSlots = Array.from(
    new Map(teachingAssignments.map((a: any) => [`${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`, a])).values()
  );
  const totalMins = (uniqueTeachingSlots as any[]).reduce((sum: number, a: any) => sum + parseFloat(String(a.timeBlock.duration ?? 0)), 0);
  const th = Math.floor(totalMins / 60);
  const tm = totalMins % 60;
  const hoursLabel = totalMins > 0 ? (tm > 0 ? `${th}h ${tm}min` : `${th}h`) : "";

  const getExportTitle = () => {
    if (isTeacherView) return `HORARIO: ${teacherName || currentUser?.username}`;
    const selectedName = options.find(o => o.id === selectedId)?.name || "";
    const selectedSection = viewType === "grade" ? options.find(o => o.id === selectedId)?.section || "" : "";
    return `${t.schedule.types[viewType].toUpperCase()}: ${selectedName} ${selectedSection}`.trim();
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: getExportTitle(),
      subtitle: t.schedule.export.subtitle,
      viewType,
      timeBlocks,
      assignments,
    });
  };

  const handleExportWord = async () => {
    await exportToWord({
      title: getExportTitle(),
      subtitle: t.schedule.export.subtitle,
      viewType,
      timeBlocks,
      assignments,
    });
  };

  const handleExportImage = async () => {
    const name = isTeacherView ? (teacherName || currentUser?.username || "") : (options.find(o => o.id === selectedId)?.name || "");
    await exportToImage("printable-schedule", `${t.nav.schedule}_${name.replace(/\s+/g, "_")}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.schedule.title}</h1>
          <p className="text-muted-foreground">
            {t.schedule.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button asChild variant="default" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Link href="/schedule/generate">
                <Sparkles className="w-4 h-4" />
                {t.schedule.generate.title}
              </Link>
            </Button>
          )}
          {canManage && <AssignmentForm onSuccess={() => fetchAssignments()} />}
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {t.schedule.print}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" />
            {t.schedule.pdf}
          </Button>
          <Button variant="outline" onClick={handleExportWord} className="gap-2">
            <Download className="w-4 h-4" />
            {t.schedule.word}
          </Button>
          <Button variant="outline" onClick={handleExportImage} className="gap-2">
            <Download className="w-4 h-4" />
            {t.schedule.image}
          </Button>
        </div>
      </div>

      {isTeacherView ? (
        <Card className="no-print border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                {(teacherName || currentUser?.username)?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Mi horario</p>
                <p className="text-base font-bold text-blue-900">{teacherName || currentUser?.username}</p>
                {teacherName && currentUser?.username && (
                  <p className="text-xs text-blue-500">usuario: {currentUser.username}</p>
                )}
                {hoursLabel && (
                  <p className="text-sm font-bold text-blue-700 mt-1">⏰ Total semanal: {hoursLabel}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="no-print">
          <CardContent className="pt-6">
            {hoursLabel && (
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-blue-700">
                <span>⏰ Total semanal de clases:</span>
                <span className="text-base">{hoursLabel}</span>
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3 space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.schedule.viewType}</label>
                <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="teacher">{t.schedule.types.teacher}</TabsTrigger>
                    <TabsTrigger value="grade">{t.schedule.types.grade}</TabsTrigger>
                    <TabsTrigger value="room">{t.schedule.types.room}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="w-full md:w-2/3 space-y-2 relative" ref={comboboxRef}>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.schedule.select.replace('{type}', t.schedule.types[viewType])}
                </label>
                <div className="relative">
                  <input
                    value={searchQuery || (options.find(o => o.id === selectedId) ? (viewType === "grade" ? `${options.find(o => o.id === selectedId)?.name}${options.find(o => o.id === selectedId)?.section || ""}` : options.find(o => o.id === selectedId)?.name) : "")}
                    onChange={e => { setSearchQuery(e.target.value); setComboOpen(true); }}
                    onFocus={() => { setSearchQuery(""); setComboOpen(true); }}
                    placeholder="Buscar..."
                    className="w-full text-sm border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800"
                  />
                  {comboOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {options
                        .filter(opt => {
                          const label = viewType === "grade" ? `${opt.name}${opt.section || ""}` : opt.name;
                          return label.toLowerCase().includes(searchQuery.toLowerCase());
                        })
                        .map(opt => {
                          const label = viewType === "grade" ? `${opt.name}${opt.section || ""}` : opt.name;
                          return (
                            <div
                              key={opt.id}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 dark:text-slate-100 ${opt.id === selectedId ? "bg-blue-100 dark:bg-slate-600 font-medium" : ""}`}
                              onMouseDown={() => { setSelectedId(opt.id); setSearchQuery(""); setComboOpen(false); }}
                            >
                              {label}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Cargando horario...</p>
        </div>
      ) : (
        <div id="printable-schedule" className="print:m-0">
          <div className="hidden print:block mb-8 text-center border-b pb-4">
            <h2 className="text-2xl font-bold uppercase">{t.schedule.export.school}</h2>
            <h3 className="text-xl font-medium mt-2">
              {isTeacherView
                ? `HORARIO: ${teacherName || currentUser?.username}`
                : `${t.nav.schedule.toUpperCase()}: ${options.find(o => o.id === selectedId)?.name ?? ""}${viewType === "grade" ? " " + (options.find(o => o.id === selectedId)?.section ?? "") : ""}`
              }
            </h3>
            {hoursLabel && (
              <p className="text-base font-bold text-blue-700 mt-1">&#128336; Total semanal de clases: {hoursLabel}</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.schedule.export.subtitle.split('|')[1]}</p>
          </div>
          
          <ScheduleGrid 
            assignments={assignments} 
            timeBlocks={timeBlocks} 
            viewType={viewType}
            onRefresh={() => fetchAssignments()}
          />
          
          <div className="hidden print:flex justify-between mt-12 px-8">
            <div className="border-t border-slate-400 w-48 text-center pt-2 text-xs font-bold">{t.schedule.export.coordination}</div>
            <div className="border-t border-slate-400 w-48 text-center pt-2 text-xs font-bold">{t.schedule.export.direction}</div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 6mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          header, footer, nav {
            display: none !important;
          }
          #printable-schedule {
            width: 100%;
          }
          #printable-schedule table {
            width: 100%;
            font-size: 8px;
            border-collapse: collapse;
          }
          #printable-schedule th,
          #printable-schedule td {
            padding: 2px 3px !important;
            line-height: 1.2;
          }
          #printable-schedule tr {
            height: auto !important;
            min-height: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

// Remove local Card/CardContent as they are now imported from ui


