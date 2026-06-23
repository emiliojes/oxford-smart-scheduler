"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ChevronLeft, ChevronRight, BookOpen, FileText, Sheet, Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AssignmentForm } from "@/components/AssignmentForm";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

interface Grade {
  id: string;
  name: string;
  section: string | null;
  level: string;
}

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { name: string };
  grade: { name: string; section: string | null } | null;
  room: { id: string; name: string } | null;
  timeBlock: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    blockType: string;
    duration: string;
  };
  note: string | null;
  status: string;
}

interface TimeBlock {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  blockType: string;
  duration: string;
  level: string;
}

const LEVEL_ORDER = ["PRIMARY", "LOW_SECONDARY", "SECONDARY", "BOTH"];
const GRADE_ORDER = ["K", "PK", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function sortGrades(grades: Grade[]) {
  return [...grades].sort((a, b) => {
    const li = LEVEL_ORDER.indexOf(a.level);
    const lj = LEVEL_ORDER.indexOf(b.level);
    if (li !== lj) return li - lj;
    const ni = GRADE_ORDER.indexOf(a.name);
    const nj = GRADE_ORDER.indexOf(b.name);
    if (ni !== nj) return (ni === -1 ? 99 : ni) - (nj === -1 ? 99 : nj);
    return (a.section ?? "").localeCompare(b.section ?? "");
  });
}

function gradeLabel(g: Grade) {
  const prefix = g.level === "PRIMARY" || g.level === "BOTH" ? "Grade" : "Grade";
  const name = g.name === "K" ? "Kinder" : g.name;
  return `${name}${g.section ? ` ${g.section}` : ""}`;
}

function shortRoom(name: string | null | undefined): string {
  if (!name) return "";
  return name.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function formatTime12h(time: string): string {
  const [hourStr, minute = "00"] = time.split(":");
  const hour = Number(hourStr);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.padStart(2, "0")} ${suffix}`;
}

function getSecondaryGroup(gradeName: string | null | undefined): "MIDDLE" | "HIGH" | null {
  const grade = Number(gradeName);
  if ([6, 7, 8].includes(grade)) return "MIDDLE";
  if ([9, 10, 11, 12].includes(grade)) return "HIGH";
  return null;
}

function getSchoolLevel(g: Grade): string {
  const n = Number(g.name);
  if ([6,7,8].includes(n)) return "MIDDLE SCHOOL";
  if ([9,10,11,12].includes(n)) return "HIGH SCHOOL";
  if (g.level === "PRIMARY") return "PRIMARY SCHOOL";
  return "SECONDARY";
}

export default function GradeSchedulePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoom, setShowRoom] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TimeBlock | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);

  const isAdmin = user?.role === "ADMIN" || user?.role === "DIRECTOR";

  const saveBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBlock) return;
    const fd = new FormData(e.currentTarget);
    setBlockSaving(true);
    try {
      const res = await fetch("/api/time-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBlock.id,
          dayOfWeek: editingBlock.dayOfWeek,
          startTime: fd.get("startTime"),
          endTime: fd.get("endTime"),
          blockType: fd.get("blockType"),
          level: editingBlock.level,
          duration: editingBlock.duration,
        }),
      });
      if (res.ok) {
        toast.success("Bloque actualizado");
        setBlockDialogOpen(false);
        // Refresh time blocks
        fetch("/api/time-blocks").then(r => r.json()).then(setTimeBlocks);
      } else {
        toast.error("Error al actualizar bloque");
      }
    } catch { toast.error("Error"); }
    finally { setBlockSaving(false); }
  };

  const refreshAssignments = () => {
    if (!selectedGradeId) return;
    setLoading(true);
    fetch(`/api/assignments?gradeId=${selectedGradeId}`)
      .then(r => r.json())
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // ── Shared helper: build per-grade data for export ────────────
  const buildGradeData = async (grade: Grade) => {
    const asgns: Assignment[] = await fetch(`/api/assignments?gradeId=${grade.id}`).then(r => r.json());
    const secGroup = getSecondaryGroup(grade.name);
    const baseTBs = (secGroup === "MIDDLE" || secGroup === "HIGH")
      ? timeBlocks.filter(b => b.level === "SECONDARY" || b.level === "LOW_SECONDARY" || b.level === "BOTH")
      : timeBlocks;
    const tbs = secGroup ? [
      ...baseTBs.filter(b => {
        if (b.blockType === "LUNCH") return false;
        // Don't filter out blocks that have assignments
        const hasAssignments = asgns.some(a => a.timeBlock.startTime === b.startTime && a.timeBlock.dayOfWeek === b.dayOfWeek);
        if (hasAssignments) return true;
        // Filter out overlapping blocks only if they don't have assignments
        if (secGroup === "MIDDLE" && b.startTime === "10:45" && b.endTime === "11:45") return false;
        if (secGroup === "MIDDLE" && b.startTime === "11:45") return false;
        if (secGroup === "HIGH" && b.startTime === "10:45" && b.endTime === "11:30") return false;
        return true;
      }),
      ...[1,2,3,4,5].map(day => ({
        id: `${secGroup.toLowerCase()}-lunch-${day}`,
        dayOfWeek: day, blockType: "LUNCH", level: "SECONDARY",
        startTime: secGroup === "MIDDLE" ? "11:30" : "12:45",
        endTime:   secGroup === "MIDDLE" ? "12:00" : "13:15",
        duration: "30",
      })),
    ] : baseTBs;
    const aTimes = new Set(asgns.map(a => a.timeBlock.startTime));
    const firstT = [...aTimes].sort()[0] ?? "";
    const lastT  = [...aTimes].sort().reverse()[0] ?? "";
    const uniqueT = Array.from(new Set(tbs.map(b => b.startTime))).sort().filter(st => {
      const blocks = tbs.filter(b => b.startTime === st);
      const isCls  = blocks.some(b => b.blockType === "CLASS");
      if (isCls) return aTimes.has(st);
      if (aTimes.has(st)) return true;
      if (!firstT) return false;
      if (blocks.some(b => b.blockType === "REGISTRATION" || b.blockType === "DISMISSAL") && asgns.length > 0) return true;
      return st >= firstT && st <= lastT;
    });
    const hrAssign = asgns.find(a => a.timeBlock.dayOfWeek === 1 && a.timeBlock.startTime === "07:30" && a.subject.name.toLowerCase() === "homeroom")
      ?? asgns.find(a => a.timeBlock.dayOfWeek === 1 && a.timeBlock.startTime === "07:30");
    const hrTeacher = hrAssign?.teacher.name ?? "";
    const roomCounts: Record<string,number> = {};
    asgns.forEach(a => { if (a.room) roomCounts[a.room.name] = (roomCounts[a.room.name] ?? 0) + 1; });
    const hrRoom = Object.entries(roomCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "";
    const schoolLevel = ["9","10","11","12"].includes(grade.name) ? "HIGH SCHOOL" : "MIDDLE SCHOOL";
    const gradeTitle = `GRADE ${grade.name}${grade.section ?? ""}`;
    const fmt = (t: string) => { const [h,m="00"]=t.split(":"); const hr=Number(h); return `${hr%12||12}:${m.padStart(2,"0")} ${hr>=12?"PM":"AM"}`; };
    const getSlotA = (day: number, time: string) => asgns.filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time);
    const blockAtA = (time: string) => tbs.find(b => b.startTime === time);
    return { asgns, tbs, aTimes, uniqueT, hrTeacher, hrRoom, schoolLevel, gradeTitle, fmt, getSlotA, blockAtA };
  };

  // ── Excel export ─────────────────────────────────────────────────
  const exportAllExcel = async () => {
    setExportingExcel(true);
    try {
      const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"];
      const wb = XLSX.utils.book_new();
      const secondaryGrades = grades.filter(g => g.level === "SECONDARY" || g.level === "LOW_SECONDARY");
      for (const grade of secondaryGrades) {
        const { uniqueT, hrTeacher, hrRoom, schoolLevel, gradeTitle, fmt, getSlotA, blockAtA } = await buildGradeData(grade);
        const shortRoom = (n: string) => n.replace(/\s*\(.*?\)\s*/g,"").trim();
        const header1 = [`2026 CLASS SCHEDULE — ${schoolLevel} · ${gradeTitle}${hrTeacher ? ` | ${hrTeacher}${hrRoom ? ` — ${shortRoom(hrRoom)}` : ""}` : ""}`, "","","","",""];
        const header2 = ["TIME", ...DAYS];
        const dataRows = uniqueT.map(time => {
          const blk = blockAtA(time);
          const btype = blk?.blockType ?? "CLASS";
          const endT = blk?.endTime ?? "";
          const timeLabel = `${fmt(time)} - ${fmt(endT)}`;
          if (btype === "REGISTRATION") return [timeLabel, "REGISTRATION","REGISTRATION","REGISTRATION","REGISTRATION","REGISTRATION"];
          if (btype === "BREAK")        return [timeLabel, "BREAK","BREAK","BREAK","BREAK","BREAK"];
          if (btype === "LUNCH")        return [timeLabel, "LUNCH","LUNCH","LUNCH","LUNCH","DEPARTURE"];
          if (btype === "DISMISSAL")    return [timeLabel, "DEPARTURE","DEPARTURE","DEPARTURE","DEPARTURE","DEPARTURE"];
          return [timeLabel, ...DAYS.map((_,di) => getSlotA(di+1, time).map(a => a.subject.name).join(" / ") || "")];
        });
        const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...dataRows]);
        ws["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:5} }];
        ws["!cols"] = [{wch:18},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}];
        const sheetName = `${grade.name}${grade.section ?? ""}`.replace(/[^a-zA-Z0-9]/g,"").slice(0,31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
      const buf = XLSX.write(wb, { bookType:"xlsx", type:"array" });
      saveAs(new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "horarios-secundaria-2026.xlsx");
    } finally { setExportingExcel(false); }
  };

  // ── Word export ───────────────────────────────────────────────────
  const exportAllWord = async () => {
    setExportingWord(true);
    try {
      const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"];
      const secondaryGrades = grades.filter(g => g.level === "SECONDARY" || g.level === "LOW_SECONDARY");
      const buildWordHtml = (table: string) =>
        `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:0;padding:0;}</style></head><body>${table}</body></html>`;

      for (let i = 0; i < secondaryGrades.length; i++) {
        const grade = secondaryGrades[i];
        const { uniqueT, hrTeacher, hrRoom, schoolLevel, gradeTitle, fmt, getSlotA, blockAtA } = await buildGradeData(grade);
        const shortRoom = (n: string) => n.replace(/\s*\(.*?\)\s*/g,"").trim();
        const thStyle = `style="background:#1e3a5f;color:white;padding:5pt;font-size:9pt;font-weight:bold;text-align:center;border:1px solid #1e3a5f;"`;
        const rows = uniqueT.map(time => {
          const blk = blockAtA(time);
          const btype = blk?.blockType ?? "CLASS";
          const endT = blk?.endTime ?? "";
          const timeCell = `<td style="font-size:8pt;font-weight:bold;color:#1e3a5f;padding:6pt 5pt;border:1px solid #d1d5db;width:72pt;white-space:nowrap;">${fmt(time)}<br><span style="font-weight:normal;color:#94a3b8;font-size:7pt;">- ${fmt(endT)}</span></td>`;
          const mkCell = (txt: string, bg: string, clr: string) =>
            `<td style="background:${bg};color:${clr};font-size:8.5pt;font-weight:bold;text-align:center;padding:7pt 4pt;border:1px solid #d1d5db;">${txt}</td>`;
          if (btype === "REGISTRATION") return `<tr>${timeCell}${[0,1,2,3,4].map(()=>mkCell("REGISTRATION","#eff6ff","#2563eb")).join("")}</tr>`;
          if (btype === "BREAK")        return `<tr>${timeCell}${[0,1,2,3,4].map(()=>mkCell("BREAK","#1e3a5f","white")).join("")}</tr>`;
          if (btype === "LUNCH")        return `<tr>${timeCell}${[0,1,2,3,4].map((_,di)=>mkCell(di===4?"DEPARTURE":"LUNCH",di===4?"#1e3a5f":"#fef3c7",di===4?"white":"#92400e")).join("")}</tr>`;
          if (btype === "DISMISSAL")    return `<tr>${timeCell}${[0,1,2,3,4].map(()=>mkCell("DEPARTURE","#1e3a5f","white")).join("")}</tr>`;
          return `<tr>${timeCell}${[0,1,2,3,4].map((_,di)=>{
            const slot = getSlotA(di+1, time);
            const txt = slot.map(a=>a.subject.name.toUpperCase()).join(" / ") || "";
            return `<td style="font-size:8.5pt;font-weight:bold;text-align:center;padding:7pt 4pt;border:1px solid #d1d5db;">${txt}</td>`;
          }).join("")}</tr>`;
        }).join("");
        const table = `
          <div style="padding:10pt;">
            <table width="100%" style="background:#1e3a5f;margin-bottom:8pt;border-radius:4pt;"><tr><td style="color:white;text-align:center;padding:10pt;">
              <div style="font-size:8pt;color:#93c5fd;font-weight:bold;letter-spacing:2pt;text-transform:uppercase;">2026 CLASS SCHEDULE</div>
              <div style="font-size:15pt;font-weight:bold;text-transform:uppercase;color:white;margin:3pt 0;">${schoolLevel} · ${gradeTitle}</div>
              ${hrTeacher?`<div style="font-size:9pt;color:#cbd5e1;"><span style="color:#93c5fd;font-weight:bold;">HR:</span> ${hrTeacher}${hrRoom?` — ${shortRoom(hrRoom)}`:""}</div>`:""}
            </td></tr></table>
            <table width="100%" style="border-collapse:collapse;font-size:9pt;">
              <thead><tr><th ${thStyle}>TIME</th>${DAYS.map(d=>`<th ${thStyle}>${d}</th>`).join("")}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
        const blob = new Blob(["\ufeff", buildWordHtml(table)], { type:"application/msword" });
        const fileName = `horario-${grade.name}${grade.section ?? ""}-2026.doc`;
        // Stagger downloads so browser doesn't block them
        await new Promise<void>(resolve => setTimeout(() => { saveAs(blob, fileName); resolve(); }, i * 400));
      }
    } finally { setExportingWord(false); }
  };

  const exportAllPDF = async () => {
    setExportingAll(true);
    try {
      const secondaryGrades = grades.filter(g => g.level === "SECONDARY" || g.level === "LOW_SECONDARY");
      const pages: string[] = [];

      for (const grade of secondaryGrades) {
        const asgns: Assignment[] = await fetch(`/api/assignments?gradeId=${grade.id}`).then(r => r.json());
        const secGroup = getSecondaryGroup(grade.name);
        const baseTBs = (secGroup === "MIDDLE" || secGroup === "HIGH")
          ? timeBlocks.filter(b => b.level === "SECONDARY" || b.level === "LOW_SECONDARY" || b.level === "BOTH")
          : timeBlocks;
        const tbs = secGroup ? [
          ...baseTBs.filter(b => {
            if (b.blockType === "LUNCH") return false;
            // Don't filter out blocks that have assignments
            const hasAssignments = asgns.some(a => a.timeBlock.startTime === b.startTime && a.timeBlock.dayOfWeek === b.dayOfWeek);
            if (hasAssignments) return true;
            // Filter out overlapping blocks only if they don't have assignments
            if (secGroup === "MIDDLE" && b.startTime === "10:45" && b.endTime === "11:45") return false;
            if (secGroup === "MIDDLE" && b.startTime === "11:45") return false;
            if (secGroup === "HIGH" && b.startTime === "10:45" && b.endTime === "11:30") return false;
            return true;
          }),
          ...[1,2,3,4,5].map(day => ({
            id: `${secGroup.toLowerCase()}-lunch-${day}`,
            dayOfWeek: day, blockType: "LUNCH", level: "SECONDARY",
            startTime: secGroup === "MIDDLE" ? "11:30" : "12:45",
            endTime:   secGroup === "MIDDLE" ? "12:00" : "13:15",
            duration: "30",
          })),
        ] : baseTBs;

        const aTimes = new Set(asgns.map(a => a.timeBlock.startTime));
        const firstT = [...aTimes].sort()[0] ?? "";
        const lastT  = [...aTimes].sort().reverse()[0] ?? "";
        const uniqueT = Array.from(new Set(tbs.map(b => b.startTime))).sort().filter(st => {
          const blocks = tbs.filter(b => b.startTime === st);
          const isCls  = blocks.some(b => b.blockType === "CLASS");
          if (isCls) return aTimes.has(st);
          if (aTimes.has(st)) return true;
          if (!firstT) return false;
          if (blocks.some(b => b.blockType === "REGISTRATION" || b.blockType === "DISMISSAL") && asgns.length > 0) return true;
          return st >= firstT && st <= lastT;
        });

        const hrAssign = asgns.find(a => a.timeBlock.dayOfWeek === 1 && a.timeBlock.startTime === "07:30" && a.subject.name.toLowerCase() === "homeroom")
          ?? asgns.find(a => a.timeBlock.dayOfWeek === 1 && a.timeBlock.startTime === "07:30");
        const hrTeacher = hrAssign?.teacher.name ?? "";
        const roomCounts: Record<string,number> = {};
        asgns.forEach(a => { if (a.room) roomCounts[a.room.name] = (roomCounts[a.room.name] ?? 0) + 1; });
        const hrRoom = Object.entries(roomCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "";
        const schoolLevel = ["9","10","11","12"].includes(grade.name) ? "HIGH SCHOOL" : "MIDDLE SCHOOL";
        const gradeTitle = `GRADE ${grade.name}${grade.section ?? ""}`;
        const subShortRoom = (n: string) => n.replace(/\s*\(.*?\)\s*/g,"").trim();

        const DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"];
        const getSlot = (day: number, time: string) =>
          asgns.filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time);
        const blockAt = (time: string) => tbs.find(b => b.startTime === time);
        const fmt = (t: string) => { const [h,m="00"]=t.split(":"); const hr=Number(h); return `${hr%12||12}:${m.padStart(2,"0")} ${hr>=12?"PM":"AM"}`; };

        const rows = uniqueT.map(time => {
          const blk = blockAt(time);
          const btype = blk?.blockType ?? "CLASS";
          const endT = blk?.endTime ?? "";
          const tc = `<td class="time">${fmt(time)}<br><span>- ${fmt(endT)}</span></td>`;
          if (btype === "REGISTRATION") return `<tr>${tc}${[1,2,3,4,5].map(()=>`<td class="special reg">REGISTRATION</td>`).join("")}</tr>`;
          if (btype === "BREAK")        return `<tr>${tc}${[1,2,3,4,5].map(()=>`<td class="special brk">BREAK</td>`).join("")}</tr>`;
          if (btype === "LUNCH")        return `<tr>${tc}${[1,2,3,4,5].map((_, di) => { const isFriday = di === 4; return isFriday && aTimes.size > 0 && !getSlot(5, time).length ? `<td class="special dep">DEPARTURE</td>` : `<td class="special lnc">LUNCH</td>`; }).join("")}</tr>`;
          if (btype === "DISMISSAL")    return `<tr>${tc}${[1,2,3,4,5].map(()=>`<td class="special dep">DEPARTURE</td>`).join("")}</tr>`;
          return `<tr>${tc}${[1,2,3,4,5].map((_,di) => {
            const slot = getSlot(di+1, time);
            if (!slot.length) return `<td></td>`;
            return `<td>${slot.map(a => `<div class="subj">${a.subject.name}</div>`).join("")}</td>`;
          }).join("")}</tr>`;
        }).join("");

        pages.push(`
          <div class="page">
            <div class="header">
              <div class="header-sub">2026 CLASS SCHEDULE</div>
              <div class="header-title">${schoolLevel} · ${gradeTitle}</div>
              ${hrTeacher ? `<div class="header-info"><span style="color:#93c5fd;font-weight:bold;">HR:</span> ${hrTeacher}${hrRoom ? ` — ${subShortRoom(hrRoom)}` : ""}</div>` : ""}
            </div>
            <table>
              <thead><tr><th>TIME</th>${DAYS.map(d=>`<th>${d}</th>`).join("")}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`);
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
          html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#fff;}
          .page{page-break-after:always;padding:12px;}
          .page:last-child{page-break-after:auto;}
          .header{background:#1e3a5f!important;color:white!important;text-align:center;padding:14px;margin-bottom:8px;border-radius:4px;}
          .header-sub{font-size:10px;color:#93c5fd!important;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
          .header-title{font-size:18px;font-weight:bold;text-transform:uppercase;margin:4px 0;color:white!important;}
          .header-info{font-size:11px;color:#cbd5e1!important;margin-top:4px;}
          table{width:100%;border-collapse:collapse;font-size:10px;}
          th{background:#1e3a5f!important;color:white!important;padding:7px 4px;text-align:center;font-size:9px;font-weight:bold;letter-spacing:0.5px;}
          td{border:1px solid #d1d5db;padding:7px 5px;text-align:center;vertical-align:middle;min-height:32px;}
          td.time{font-weight:bold;font-size:9px;color:#1e3a5f;white-space:nowrap;width:76px;background:#f8fafc;text-align:left;padding-left:6px;}
          td.time span{display:block;font-weight:normal;font-size:8px;color:#94a3b8;margin-top:1px;}
          .special{font-weight:bold;font-size:9px;text-transform:uppercase;padding:2px;}
          .reg{color:#2563eb!important;background:#eff6ff!important;}
          .brk{color:white!important;background:#1e3a5f!important;}
          .lnc{color:#92400e!important;background:#fef3c7!important;}
          .dep{color:white!important;background:#1e3a5f!important;}
          .subj{font-weight:bold;text-transform:uppercase;font-size:9px;color:#1e293b;}
          @media print{
            html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
            .page{page-break-after:always;}
            .page:last-child{page-break-after:auto;}
          }
        </style>
      </head><body>${pages.join("")}</body></html>`;

      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800); }
    } finally {
      setExportingAll(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/grades").then(r => r.json()),
      fetch("/api/time-blocks").then(r => r.json()),
    ]).then(([g, tb]) => {
      const sorted = sortGrades(g);
      setGrades(sorted);
      setTimeBlocks(tb);
      const firstSecondary = sorted.find(gr => gr.level === "SECONDARY" || gr.level === "LOW_SECONDARY");
      setSelectedGradeId((firstSecondary ?? sorted[0])?.id ?? "");
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedGradeId) return;
    setLoading(true);
    fetch(`/api/assignments?gradeId=${selectedGradeId}`)
      .then(r => r.json())
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedGradeId]);

  const selectedGrade = grades.find(g => g.id === selectedGradeId);
  const selectedIdx = grades.findIndex(g => g.id === selectedGradeId);

  const goNext = () => { if (selectedIdx < grades.length - 1) setSelectedGradeId(grades[selectedIdx + 1].id); };
  const goPrev = () => { if (selectedIdx > 0) setSelectedGradeId(grades[selectedIdx - 1].id); };

  // Get the homeroom teacher (most assignments)
  const teacherCount: Record<string, { name: string; count: number }> = {};
  assignments.forEach(a => {
    const tid = a.teacher.id;
    if (!teacherCount[tid]) teacherCount[tid] = { name: a.teacher.name, count: 0 };
    teacherCount[tid].count++;
  });
  const homeroomAssignment = assignments.find(
    a => a.timeBlock.dayOfWeek === 1 && a.timeBlock.startTime === "07:30" && a.subject.name.toLowerCase() === "homeroom"
  ) ?? assignments.find(
    a => a.timeBlock.dayOfWeek === 1 && a.timeBlock.startTime === "07:30"
  );
  const homeroomTeacher = homeroomAssignment?.teacher.name
    ?? Object.values(teacherCount).sort((a, b) => b.count - a.count)[0]?.name
    ?? "";

  const roomCount: Record<string, { name: string; count: number }> = {};
  assignments.forEach(a => {
    if (!a.room) return;
    const rn = a.room.name;
    if (!roomCount[rn]) roomCount[rn] = { name: rn, count: 0 };
    roomCount[rn].count++;
  });
  const homeroomRoom = Object.values(roomCount).sort((a, b) => b.count - a.count)[0]?.name ?? "";

  // Build time slots — filter to relevant level
  const secondaryGroup = getSecondaryGroup(selectedGrade?.name);
  const gradeLevel = selectedGrade?.level ?? "";
  // For secondary grades: include BOTH SECONDARY and LOW_SECONDARY blocks so REGISTRATION/BREAK/DISMISSAL
  // are always present, then remove the wrong 10:45 endTime duplicate for the specific group
  const baseRelevantTBs = (secondaryGroup === "MIDDLE" || secondaryGroup === "HIGH")
    ? timeBlocks.filter(b => b.level === "SECONDARY" || b.level === "LOW_SECONDARY" || b.level === "BOTH")
    : timeBlocks.filter(b => b.level === gradeLevel || b.level === "BOTH" || gradeLevel === "");
  const relevantTBs = secondaryGroup
    ? [
        ...baseRelevantTBs.filter(b => {
          if (b.blockType === "LUNCH") return false;
          // Don't filter out blocks that have assignments
          const hasAssignments = assignments.some(a => a.timeBlock.startTime === b.startTime && a.timeBlock.dayOfWeek === b.dayOfWeek);
          if (hasAssignments) return true;
          // Filter out overlapping blocks only if they don't have assignments
          if (secondaryGroup === "MIDDLE" && b.startTime === "10:45" && b.endTime === "11:45") return false;
          if (secondaryGroup === "MIDDLE" && b.startTime === "11:45") return false;
          if (secondaryGroup === "HIGH" && b.startTime === "10:45" && b.endTime === "11:30") return false;
          return true;
        }),
        ...[1, 2, 3, 4, 5].map(day => ({
          id: `${secondaryGroup.toLowerCase()}-lunch-${day}`,
          dayOfWeek: day,
          startTime: secondaryGroup === "MIDDLE" ? "11:30" : "12:45",
          endTime:   secondaryGroup === "MIDDLE" ? "12:00" : "13:15",
          duration: "30",
          blockType: "LUNCH",
          level: "SECONDARY",
        })),
      ]
    : baseRelevantTBs;

  const assignmentTimes = new Set(assignments.map(a => a.timeBlock.startTime));
  const firstTime = [...assignmentTimes].sort()[0] ?? "";
  const lastTime  = [...assignmentTimes].sort().reverse()[0] ?? "";

  // For Middle School (LOW_SECONDARY), always show standard time blocks
  const standardMiddleBlocks = ["07:15", "07:30", "08:30", "09:30", "09:45", "10:45", "11:30", "12:00", "13:00", "14:00", "15:15"];
  
  const uniqueTimes = Array.from(new Set(relevantTBs.map(b => b.startTime))).sort().filter(st => {
    const blocks = relevantTBs.filter(b => b.startTime === st);
    const isClass      = blocks.some(b => b.blockType === "CLASS");
    const isRegistration = blocks.some(b => b.blockType === "REGISTRATION");
    const isDismissalB   = blocks.some(b => b.blockType === "DISMISSAL");
    const isLunch      = blocks.some(b => b.blockType === "LUNCH");
    const isBreak      = blocks.some(b => b.blockType === "BREAK");
    
    // For Middle School grades, always show standard blocks
    if (secondaryGroup === "MIDDLE" && standardMiddleBlocks.includes(st)) {
      return true;
    }
    
    // For CLASS blocks: check if overlaps with another class
    if (isClass) {
      const stNum = parseInt(st.replace(":", ""));
      const isOverlapping = assignments.some(a => {
        const aStart = parseInt(a.timeBlock.startTime.replace(":", ""));
        const aEnd = parseInt(a.timeBlock.endTime.replace(":", ""));
        return stNum > aStart && stNum < aEnd;
      });
      if (isOverlapping) return false; // Don't show if overlaps
      
      // Show if has any assignment
      const hasAnyAssignment = [1, 2, 3, 4, 5].some(day => 
        assignments.some(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === st)
      );
      return hasAnyAssignment;
    }
    
    // Always show special blocks if there are any assignments in the schedule
    if (assignments.length > 0) {
      if (isRegistration) return true;
      if (isDismissalB) return true;
      if (isLunch) return true;
      if (isBreak) return true;
    }
    
    return false;
  });

  const DAYS = t.timeBlocks.days as string[];

  const getSlot = (day: number, time: string) => {
    const block = blockAt(time);
    if (block?.blockType === "LUNCH") return [];
    return assignments.filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time);
  };

  const blockAt = (time: string) => relevantTBs.find(b => b.startTime === time);

  // Subject color map
  const subjectColors = [
    "bg-blue-100 text-blue-800 border-blue-300",
    "bg-emerald-100 text-emerald-800 border-emerald-300",
    "bg-violet-100 text-violet-800 border-violet-300",
    "bg-amber-100 text-amber-800 border-amber-300",
    "bg-rose-100 text-rose-800 border-rose-300",
    "bg-cyan-100 text-cyan-800 border-cyan-300",
    "bg-orange-100 text-orange-800 border-orange-300",
    "bg-teal-100 text-teal-800 border-teal-300",
    "bg-indigo-100 text-indigo-800 border-indigo-300",
    "bg-pink-100 text-pink-800 border-pink-300",
    "bg-lime-100 text-lime-800 border-lime-300",
    "bg-sky-100 text-sky-800 border-sky-300",
  ];
  const subjectColorMap: Record<string, string> = {};
  let colorIdx = 0;
  assignments.forEach(a => {
    if (!subjectColorMap[a.subject.name]) {
      subjectColorMap[a.subject.name] = subjectColors[colorIdx % subjectColors.length];
      colorIdx++;
    }
  });

  const levelGroups: Record<string, Grade[]> = {};
  grades.forEach(g => {
    if (!levelGroups[g.level]) levelGroups[g.level] = [];
    levelGroups[g.level].push(g);
  });

  const levelLabel = (l: string) => {
    if (l === "PRIMARY") return t.teachers.levels.PRIMARY;
    if (l === "LOW_SECONDARY") return t.teachers.levels.LOW_SECONDARY;
    if (l === "SECONDARY") return t.teachers.levels.SECONDARY;
    return l;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t.schedule.types.grade} — {t.schedule.title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> {t.schedule.print}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 border-blue-500 text-blue-700 hover:bg-blue-50" onClick={exportAllPDF} disabled={exportingAll || grades.length === 0}>
            <Printer className="w-4 h-4" /> {exportingAll ? "Generando..." : "PDF Todos"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 border-green-600 text-green-700 hover:bg-green-50" onClick={exportAllExcel} disabled={exportingExcel || grades.length === 0}>
            <Sheet className="w-4 h-4" /> {exportingExcel ? "Generando..." : "Excel"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 border-indigo-500 text-indigo-700 hover:bg-indigo-50" onClick={exportAllWord} disabled={exportingWord || grades.length === 0}>
            <FileText className="w-4 h-4" /> {exportingWord ? "Generando..." : "Word"}
          </Button>
        </div>
      </div>

      {/* Grade selector */}
      <div className="no-print flex flex-wrap gap-4 items-start">
        {LEVEL_ORDER.filter(l => levelGroups[l] && l !== "PRIMARY").map(level => (
          <div key={level}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">{levelLabel(level)}</p>
            <div className="flex flex-wrap gap-1">
              {levelGroups[level].map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGradeId(g.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                    g.id === selectedGradeId
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-slate-800 border-slate-300 hover:border-blue-400 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {gradeLabel(g)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      {selectedGrade && (
        <div className="no-print flex items-center gap-2">
          <button
            onClick={() => setShowRoom(v => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showRoom
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 border-slate-300 text-slate-500 dark:text-slate-400"
            }`}
          >
            {showRoom ? "Ocultar Salón" : "Mostrar Salón"}
          </button>
          <button
            onClick={() => setShowTeacher(v => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showTeacher
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white dark:bg-slate-800 border-slate-300 text-slate-500 dark:text-slate-400"
            }`}
          >
            {showTeacher ? "Ocultar Profesor" : "Mostrar Profesor"}
          </button>
        </div>
      )}

      {/* Prev / Next navigation */}
      {selectedGrade && (
        <div className="no-print flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={selectedIdx === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> {selectedIdx > 0 ? gradeLabel(grades[selectedIdx - 1]) : ""}
          </Button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {selectedIdx + 1} / {grades.length}
          </span>
          <Button variant="ghost" size="sm" onClick={goNext} disabled={selectedIdx === grades.length - 1}>
            {selectedIdx < grades.length - 1 ? gradeLabel(grades[selectedIdx + 1]) : ""} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Schedule grid */}
      {selectedGrade && (
        <div id="printable-grade-schedule">
          {/* Print header — Excel style matching Oxford PNG schedules */}
          <div className="hidden print:block mb-3">
            <table className="w-full border-2 border-[#1e3a5f]" style={{borderCollapse:'collapse'}}>
              <tbody>
                <tr style={{background:'#1e3a5f'}}>
                  <td className="w-16 border border-[#1e3a5f] p-1 text-center align-middle bg-white" rowSpan={2} style={{width:'56px'}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Oxford Logo" style={{width:'44px',height:'auto',margin:'0 auto'}} />
                  </td>
                  <td className="border border-[#2d5a9e] text-center align-middle py-2" colSpan={5} style={{background:'#1e3a5f',color:'white'}}>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#93c5fd'}}>2026 CLASS SCHEDULE</div>
                    <div className="text-sm font-bold uppercase">{getSchoolLevel(selectedGrade)} · GRADE {gradeLabel(selectedGrade)}</div>
                    {homeroomTeacher && <div className="text-[10px]" style={{color:'#cbd5e1'}}><span style={{color:'#93c5fd',fontWeight:'bold'}}>HR:</span> {homeroomTeacher}{(showRoom && homeroomRoom) ? ` — ${shortRoom(homeroomRoom)}` : ""}</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Screen header — matches Oxford reference style */}
          <div className="no-print mb-3 rounded overflow-hidden border-2 border-[#1e3a5f]">
            <table className="w-full" style={{borderCollapse:'collapse'}}>
              <tbody>
                <tr style={{background:'#1e3a5f'}}>
                  <td className="p-2 text-center align-middle bg-white" style={{width:'72px',borderRight:'2px solid #1e3a5f'}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="Oxford" style={{width:'56px',height:'auto',margin:'0 auto'}} />
                  </td>
                  <td className="text-center align-middle py-3" style={{background:'#1e3a5f',color:'white'}}>
                    <div className="text-[11px] font-semibold uppercase tracking-widest" style={{color:'#93c5fd'}}>2026 CLASS SCHEDULE</div>
                    <div className="text-lg font-bold uppercase mt-0.5">{getSchoolLevel(selectedGrade)} · GRADE {gradeLabel(selectedGrade)}</div>
                    {(homeroomTeacher || homeroomRoom) && (
                      <div className="text-sm mt-0.5" style={{color:'#cbd5e1'}}>
                        <span style={{color:'#93c5fd',fontWeight:'bold'}}>HR:</span> {homeroomTeacher}{(showRoom && homeroomRoom) ? ` — ${shortRoom(homeroomRoom)}` : ""}
                      </div>
                    )}
                    {loading && <div className="text-xs text-blue-300 animate-pulse mt-1">Cargando...</div>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grid table */}
          <div className="overflow-x-auto rounded-lg border shadow-sm print:overflow-visible">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="px-3 py-2 text-left font-bold w-28 border-r border-blue-600 print:text-xs">
                    {t.schedule.grid.time}
                  </th>
                  {DAYS.map((day, i) => (
                    <th key={i} className="px-3 py-2 text-center font-bold border-r border-blue-600 last:border-r-0 print:text-xs">
                      {day.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uniqueTimes.map(time => {
                  const block = blockAt(time);
                  const isBreak    = block?.blockType === "BREAK";
                  const isLunch    = block?.blockType === "LUNCH";
                  const isReg      = block?.blockType === "REGISTRATION";
                  const isDismissal = block?.blockType === "DISMISSAL";
                  const rowBg = isBreak
                    ? "bg-blue-700 text-white"
                    : isLunch
                    ? "bg-amber-50 dark:bg-amber-950/30"
                    : isReg
                    ? "bg-slate-50 dark:bg-slate-800/50"
                    : isDismissal
                    ? "bg-blue-900 text-white"
                    : "";

                  return (
                    <tr key={time} className={`border-t ${rowBg}`}>
                      <td className={`px-3 py-1.5 font-mono text-xs font-bold border-r whitespace-nowrap print:px-1 group/time ${
                        isBreak ? "text-white" : "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900"
                      }`}>
                        <div className="flex items-center gap-1">
                          <div>
                            {formatTime12h(time)}<br />
                            <span className="opacity-60 font-normal">{block?.endTime ? formatTime12h(block.endTime) : ""}</span>
                          </div>
                          {isAdmin && block && !block.id.includes("lunch") && (
                            <button
                              className="no-print ml-1 opacity-0 group-hover/time:opacity-100 transition-opacity text-slate-400 hover:text-blue-500"
                              onClick={() => { setEditingBlock(block as TimeBlock); setBlockDialogOpen(true); }}
                              title="Editar bloque"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      {[1,2,3,4,5].map(day => {
                        const slot = getSlot(day, time);
                        const isLastDay = day === 5;
                        const blockForCell = relevantTBs.find(b => b.dayOfWeek === day && b.startTime === time && b.blockType === "CLASS");
                        return (
                          <td key={day} className={`px-1.5 py-1.5 border-r last:border-r-0 text-center align-middle print:px-1 ${
                            isBreak || isDismissal ? "text-white" : ""
                          }`}>
                            {slot.length === 0 ? (
                              isBreak ? (
                                <span className="text-xs font-bold tracking-widest uppercase">BREAK</span>
                              ) : isLunch ? (
                                isLastDay
                                  ? <span className="text-xs font-bold text-blue-700 tracking-widest uppercase">DEPARTURE</span>
                                  : <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">LUNCH</span>
                              ) : isReg ? (
                                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">REGISTRATION</span>
                              ) : isDismissal ? (
                                <span className="text-xs font-bold tracking-widest uppercase">DEPARTURE</span>
                              ) : isAdmin && blockForCell ? (
                                <AssignmentForm
                                  prefilledTimeBlock={{ dayOfWeek: day, startTime: time }}
                                  onSuccess={refreshAssignments}
                                  trigger={
                                    <button className="no-print w-full h-full min-h-[32px] flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors group">
                                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                  }
                                />
                              ) : null
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {slot.map((a, ai) => (
                                  isAdmin ? (
                                    <AssignmentForm
                                      key={a.id + ai}
                                      initialData={{ id: a.id, teacherId: a.teacher.id, subjectId: "", gradeId: selectedGradeId, roomId: a.room?.id ?? "", timeBlockId: "", note: a.note ?? "" }}
                                      onSuccess={refreshAssignments}
                                      trigger={
                                        <div
                                          className={`py-1 text-xs leading-tight cursor-pointer hover:bg-blue-50 rounded px-1 transition-colors no-print ${
                                            a.status === "CONFLICT" ? "text-red-600 font-bold" : ""
                                          }`}
                                        >
                                          <div className="font-bold uppercase tracking-wide">{a.subject.name}</div>
                                          {showTeacher && a.teacher && (
                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">{a.teacher.name}</div>
                                          )}
                                          {showRoom && a.room && (
                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">{shortRoom(a.room.name)}</div>
                                          )}
                                          {a.note && <div className="text-[9px] opacity-60">({a.note})</div>}
                                        </div>
                                      }
                                    />
                                  ) : (
                                    <div
                                      key={a.id + ai}
                                      className={`py-1 text-xs leading-tight ${
                                        a.status === "CONFLICT" ? "text-red-600 font-bold" : ""
                                      }`}
                                    >
                                      <div className="font-bold uppercase tracking-wide">{a.subject.name}</div>
                                      {showTeacher && a.teacher && (
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-tight">{a.teacher.name}</div>
                                      )}
                                      {showRoom && a.room && (
                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 print:block">{shortRoom(a.room.name)}</div>
                                      )}
                                      {a.note && (
                                        <div className="text-[9px] opacity-60">({a.note})</div>
                                      )}
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Print footer */}
          <div className="hidden print:flex justify-between mt-10 px-4">
            <div className="border-t border-slate-400 w-44 text-center pt-1 text-[9px] font-bold">{t.schedule.export.coordination}</div>
            <div className="text-[9px] text-slate-400 self-end">www.oxford.edu.pa</div>
            <div className="border-t border-slate-400 w-44 text-center pt-1 text-[9px] font-bold">{t.schedule.export.direction}</div>
          </div>
        </div>
      )}

      {/* Time Block Edit Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-blue-500" /> Editar Bloque de Tiempo
            </DialogTitle>
          </DialogHeader>
          {editingBlock && (
            <form onSubmit={saveBlock} className="space-y-4 pt-2">
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                ⚠️ Este cambio afecta todos los grados que usen este bloque.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Hora inicio</Label>
                  <Input name="startTime" type="time" defaultValue={editingBlock.startTime} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora fin</Label>
                  <Input name="endTime" type="time" defaultValue={editingBlock.endTime} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de bloque</Label>
                <Select name="blockType" defaultValue={editingBlock.blockType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLASS">Clase</SelectItem>
                    <SelectItem value="REGISTRATION">Registro</SelectItem>
                    <SelectItem value="BREAK">Break</SelectItem>
                    <SelectItem value="LUNCH">Almuerzo</SelectItem>
                    <SelectItem value="DISMISSAL">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setBlockDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={blockSaving}>
                  {blockSaving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm 6mm; }
          .no-print { display: none !important; }
          body { padding: 0 !important; margin: 0 !important; background: white !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
          header, footer, nav { display: none !important; }
          #printable-grade-schedule { overflow: visible !important; }
          #printable-grade-schedule div { overflow: visible !important; }
          #printable-grade-schedule table { width: 100%; font-size: 8px; border-collapse: collapse; table-layout: fixed; }
          #printable-grade-schedule th { font-size: 8px; padding: 3px 2px !important; }
          #printable-grade-schedule td { padding: 2px 3px !important; line-height: 1.3; overflow: visible !important; word-break: break-word; }
          #printable-grade-schedule .font-bold { font-size: 8px; }
          #printable-grade-schedule .text-xs { font-size: 8px !important; }
          #printable-grade-schedule .text-\\[10px\\] { font-size: 7px !important; }
          #printable-grade-schedule .text-\\[9px\\] { font-size: 7px !important; }
          #printable-grade-schedule .flex { display: block !important; }
          #printable-grade-schedule .gap-0\\.5 > * { margin-bottom: 1px; }
          #printable-grade-schedule .py-1 { padding-top: 1px !important; padding-bottom: 1px !important; }
          #printable-grade-schedule .py-1\\.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
        }
      `}</style>
    </div>
  );
}
