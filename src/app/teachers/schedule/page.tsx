"use client";

import { useEffect, useState } from "react";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Printer, Download, Image } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

interface Teacher { id: string; name: string; level: string; }
interface SupervisionDuty {
  id: string;
  area: string;
  startTime: string;
  endTime: string;
  dayPattern: string;
  isClosed: boolean;
  teacher?: { id: string; name: string } | null;
}

const DAY_PATTERN_DAYS: Record<string, number[]> = {
  EVERYDAY:    [1,2,3,4,5],
  MON_TO_FRI:  [1,2,3,4,5],
  MON_TO_THU:  [1,2,3,4],
  TUE_AND_THU: [2,4],
  MON:[1], TUE:[2], WED:[3], THU:[4], FRI:[5],
};

const DAY_NAMES = ["","Mon","Tue","Wed","Thu","Fri"];

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suf = h >= 12 ? "p.m." : "a.m.";
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${suf}`;
}
interface Assignment {
  id: string;
  teacher: { name: string };
  subject: { name: string };
  grade: { name: string; section: string | null; level: string } | null;
  room: { name: string } | null;
  timeBlock: { dayOfWeek: number; startTime: string; endTime: string; duration: string; blockType: string; };
  note: string | null;
  status: string;
  conflicts: Array<{ description: string }>;
}
interface TimeBlock { id: string; dayOfWeek: number; startTime: string; endTime: string; duration: string; blockType: string; level: string; }

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DUTY = ["Duty", "Resource Room Support", "Homeroom"];

function getSecondaryGroup(gradeName: string | null | undefined): "MIDDLE" | "HIGH" | null {
  const g = Number(gradeName);
  if ([6, 7, 8].includes(g)) return "MIDDLE";
  if ([9, 10, 11, 12].includes(g)) return "HIGH";
  return null;
}

function getTeacherGroup(asgns: Assignment[]): "MIDDLE" | "HIGH" | "MIXED" | "OTHER" {
  const hasLow = asgns.some(a => a.grade?.level === "LOW_SECONDARY");
  const hasSec = asgns.some(a => a.grade?.level === "SECONDARY");
  if (hasLow && hasSec) return "MIXED";
  if (hasLow) return "MIDDLE";
  if (hasSec) return "HIGH";
  return "OTHER";
}

function fmt(t: string) {
  const [h, m = "00"] = t.split(":");
  const hr = Number(h);
  return `${hr % 12 || 12}:${m.padStart(2, "0")} ${hr >= 12 ? "PM" : "AM"}`;
}

function displaySubj(name: string): string {
  return name.replace("Physical Education", "P.E.").replace("Language Arts", "L.Arts");
}

function buildTeacherSchedule(asgns: Assignment[], allTBs: TimeBlock[]) {
  const hasLow = asgns.some(a => a.grade?.level === "LOW_SECONDARY");
  const hasSec = asgns.some(a => a.grade?.level === "SECONDARY");
  const isMixed = hasLow && hasSec;

  let baseTBs = isMixed || hasLow
    ? allTBs.filter(b => b.level === "LOW_SECONDARY" || b.level === "SECONDARY" || b.level === "BOTH")
    : hasSec
      ? allTBs.filter(b => b.level === "SECONDARY" || b.level === "BOTH")
      : allTBs.filter(b => b.level === "PRIMARY" || b.level === "BOTH");

  const secGroups = new Set(asgns.map(a => getSecondaryGroup(a.grade?.name)).filter(Boolean));

  const filteredTBs = baseTBs.filter(b => {
    if (b.blockType === "LUNCH") return false;
    if (!isMixed && hasLow && b.startTime === "10:45" && b.endTime === "11:45") return false;
    if (!isMixed && hasLow && b.startTime === "11:45") return false;
    if (!isMixed && hasSec && !hasLow && b.startTime === "10:45" && b.endTime === "11:30") return false;
    return true;
  });

  const withLunch: TimeBlock[] = [...filteredTBs];
  if (secGroups.has("MIDDLE")) {
    for (let d = 1; d <= 5; d++)
      withLunch.push({ id: `ml-${d}`, dayOfWeek: d, startTime: "11:30", endTime: "12:00", duration: "30", blockType: "LUNCH", level: "SECONDARY" });
  }
  if (secGroups.has("HIGH")) {
    for (let d = 1; d <= 5; d++)
      withLunch.push({ id: `hl-${d}`, dayOfWeek: d, startTime: "12:45", endTime: "13:15", duration: "30", blockType: "LUNCH", level: "SECONDARY" });
  }

  const aTimes = new Set(asgns.map(a => a.timeBlock.startTime));
  const sorted = [...aTimes].sort();
  const firstT = sorted[0] ?? "";
  const lastT = sorted[sorted.length - 1] ?? "";

  const uniqueT = [...new Set(withLunch.map(b => b.startTime))].sort().filter(st => {
    const blocks = withLunch.filter(b => b.startTime === st);
    const isCls = blocks.some(b => b.blockType === "CLASS");
    if (isCls) {
      if (aTimes.has(st)) return true;
      if (asgns.length > 0 && lastT && st <= lastT) return true;
      return false;
    }
    if (aTimes.has(st)) return true;
    if (!firstT) return false;
    if (blocks.some(b => b.blockType === "REGISTRATION") && st === "07:15") return true;
    if (blocks.some(b => b.blockType === "DISMISSAL") && asgns.length > 0) return true;
    const isImmBefore = st < firstT && blocks.some(b => b.blockType === "BREAK" || b.blockType === "LUNCH");
    if (isImmBefore) return true;
    if (!(st >= firstT && st <= lastT)) return false;
    return true;
  });

  return { uniqueT, withLunch, aTimes };
}

function hoursLabel(asgns: Assignment[]): string {
  const teaching = asgns.filter(a => a.timeBlock.blockType === "CLASS" && !DUTY.some(k => a.subject.name.includes(k)));
  const unique = Array.from(new Map(teaching.map(a => [`${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`, a])).values());
  const mins = unique.reduce((s, a) => s + parseFloat(String(a.timeBlock.duration ?? 0)), 0);
  if (!mins) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function buildTeacherPage(teacher: Teacher, asgns: Assignment[], allTBs: TimeBlock[], showSubject = false, duties: SupervisionDuty[] = []): string {
  const { uniqueT, withLunch, aTimes } = buildTeacherSchedule(asgns, allTBs);
  const group = getTeacherGroup(asgns);
  const groupLabel = group === "MIDDLE" ? "MIDDLE SCHOOL" : group === "HIGH" ? "HIGH SCHOOL" : group === "MIXED" ? "MIDDLE & HIGH SCHOOL" : "SECONDARY";
  const hrs = hoursLabel(asgns);

  const getSlot = (day: number, time: string) => asgns.filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time);
  const blockAt = (time: string) => withLunch.find(b => b.startTime === time && b.blockType === "LUNCH") ?? withLunch.find(b => b.startTime === time);
  const dutyBadge = (day: number, rowTime: string, isLunch: boolean) => {
    const areas = duties.filter(d => {
      if (!(DAY_PATTERN_DAYS[d.dayPattern]??[]).includes(day)) return false;
      if (isLunch) return rowTime < "12:00" ? (d.startTime >= "11:00" && d.startTime < "12:00") : d.startTime >= "12:00";
      return d.startTime < "11:00";
    }).map(d => d.area);
    return areas.length ? `<br>${areas.map(a => `<span class="duty">⚠ ${a}</span>`).join("<br>")}` : "";
  };

  const rows = uniqueT.map(time => {
    const blk = blockAt(time);
    const btype = blk?.blockType ?? "CLASS";
    const endT = blk?.endTime ?? "";
    const tc = `<td class="time">${fmt(time)}<br><span>- ${fmt(endT)}</span></td>`;

    if (btype === "REGISTRATION") return `<tr>${tc}${[1,2,3,4,5].map(() => `<td class="sp reg">REGISTRATION</td>`).join("")}</tr>`;
    if (btype === "BREAK")        return `<tr>${tc}${[1,2,3,4,5].map(day => `<td class="sp brk">BREAK${dutyBadge(day, time, false)}</td>`).join("")}</tr>`;
    if (btype === "DISMISSAL")    return `<tr>${tc}${[1,2,3,4,5].map(() => `<td class="sp dep">DEPARTURE</td>`).join("")}</tr>`;
    if (btype === "LUNCH") {
      const hasFriAfter = asgns.some(a => a.timeBlock.dayOfWeek === 5 && a.timeBlock.startTime > time && a.timeBlock.blockType === "CLASS");
      return `<tr>${tc}${[1,2,3,4,5].map((day, di) =>
        di === 4 && aTimes.size > 0 && !hasFriAfter ? `<td class="sp dep">DEPARTURE</td>` : `<td class="sp lnc">LUNCH${dutyBadge(day, time, true)}</td>`
      ).join("")}</tr>`;
    }

    return `<tr>${tc}${[1,2,3,4,5].map((_, di) => {
      const slot = getSlot(di + 1, time);
      if (!slot.length) return `<td></td>`;
      return `<td>${slot.map(a => {
        const gName = a.grade ? `${a.grade.name}${a.grade.section ?? ""}` : "";
        return `<div class="entry"><div class="grade">${gName}</div>${showSubject ? `<div class="subj">${displaySubj(a.subject.name)}</div>` : ""}</div>`;
      }).join("")}</td>`;
    }).join("")}</tr>`;
  }).join("");

  return `<div class="page">
    <div class="hdr">
      <div class="hdr-sub">2026 · ${groupLabel} TEACHER SCHEDULE</div>
      <div class="hdr-name">${teacher.name.toUpperCase()}</div>
      ${hrs ? `<div class="hdr-info">Weekly Teaching Hours: ${hrs}</div>` : ""}
    </div>
    <table>
      <thead><tr><th>TIME</th>${DAYS.map(d => `<th>${d}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="sigs">
      <div class="sig">Academic Coordination</div>
      <div class="sig">General Direction</div>
    </div>
  </div>`;
}

function buildWordPage(teacher: Teacher, asgns: Assignment[], allTBs: TimeBlock[], showSubject = false, duties: SupervisionDuty[] = []): string {
  const { uniqueT, withLunch, aTimes } = buildTeacherSchedule(asgns, allTBs);
  const group = getTeacherGroup(asgns);
  const groupLabel = group === "MIDDLE" ? "MIDDLE SCHOOL" : group === "HIGH" ? "HIGH SCHOOL" : group === "MIXED" ? "MIDDLE & HIGH SCHOOL" : "SECONDARY";
  const hrs = hoursLabel(asgns);
  const getSlot = (day: number, time: string) => asgns.filter(a => a.timeBlock.dayOfWeek === day && a.timeBlock.startTime === time);
  const blockAt = (time: string) => withLunch.find(b => b.startTime === time && b.blockType === "LUNCH") ?? withLunch.find(b => b.startTime === time);
  const mkCell = (txt: string, bg: string, clr: string) =>
    `<td style="background:${bg};color:${clr};font-size:8.5pt;font-weight:bold;text-align:center;padding:5pt 4pt;border:1px solid #d1d5db;">${txt}</td>`;
  const dutyBadgeW = (day: number, rowTime: string, isLunch: boolean) => {
    const areas = duties.filter(d => {
      if (!(DAY_PATTERN_DAYS[d.dayPattern]??[]).includes(day)) return false;
      if (isLunch) return rowTime < "12:00" ? (d.startTime >= "11:00" && d.startTime < "12:00") : d.startTime >= "12:00";
      return d.startTime < "11:00";
    }).map(d => d.area);
    return areas.length ? `<br>${areas.map(a => `<span style="display:inline-block;background:#0ea5e9;color:white;font-size:6.5pt;font-weight:bold;padding:1pt 3pt;border-radius:2pt;">⚠ ${a}</span>`).join("<br>")}` : "";
  };
  const rows = uniqueT.map(time => {
    const blk = blockAt(time);
    const btype = blk?.blockType ?? "CLASS";
    const endT = blk?.endTime ?? "";
    const tc = `<td style="font-size:8pt;font-weight:bold;color:#1e3a5f;padding:5pt;border:1px solid #d1d5db;width:70pt;white-space:nowrap;">${fmt(time)}<br><span style="font-weight:normal;color:#94a3b8;font-size:7pt;">- ${fmt(endT)}</span></td>`;
    if (btype === "REGISTRATION") return `<tr>${tc}${[0,1,2,3,4].map(()=>mkCell("REGISTRATION","#eff6ff","#2563eb")).join("")}</tr>`;
    if (btype === "BREAK")        return `<tr>${tc}${[1,2,3,4,5].map(day=>`<td style="background:#1e3a5f;color:white;font-size:8.5pt;font-weight:bold;text-align:center;padding:5pt 4pt;border:1px solid #d1d5db;">BREAK${dutyBadgeW(day, time, false)}</td>`).join("")}</tr>`;
    if (btype === "DISMISSAL")    return `<tr>${tc}${[0,1,2,3,4].map(()=>mkCell("DEPARTURE","#1e3a5f","white")).join("")}</tr>`;
    if (btype === "LUNCH") {
      const hasFriAfter = asgns.some(a => a.timeBlock.dayOfWeek === 5 && a.timeBlock.startTime > time && a.timeBlock.blockType === "CLASS");
      return `<tr>${tc}${[1,2,3,4,5].map((day,di) => di===4 && aTimes.size>0 && !hasFriAfter ? mkCell("DEPARTURE","#1e3a5f","white") : `<td style="background:#fef3c7;color:#92400e;font-size:8.5pt;font-weight:bold;text-align:center;padding:5pt 4pt;border:1px solid #d1d5db;">LUNCH${dutyBadgeW(day, time, true)}</td>`).join("")}</tr>`;
    }
    return `<tr>${tc}${[0,1,2,3,4].map((_,di) => {
      const slot = getSlot(di+1, time);
      if (!slot.length) return `<td style="border:1px solid #d1d5db;padding:5pt;"></td>`;
      return `<td style="border:1px solid #d1d5db;padding:4pt;text-align:center;">${slot.map(a => {
        const gName = a.grade ? `${a.grade.name}${a.grade.section??""}`  : "";
        return `<div style="font-size:8pt;"><b>${gName}</b>${showSubject ? `<br>${displaySubj(a.subject.name)}` : ""}</div>`;
      }).join("")}</td>`;
    }).join("")}</tr>`;
  }).join("");
  const th = `style="background:#1e3a5f;color:white;padding:5pt;font-size:8pt;font-weight:bold;text-align:center;border:1px solid #1e3a5f;"`;
  return `<div style="page-break-after:always;padding:10pt;">
    <table width="100%" style="background:#1e3a5f;margin-bottom:8pt;"><tr>
      <td style="color:white;text-align:center;padding:10pt;">
        <div style="font-size:9pt;color:#93c5fd;font-weight:bold;text-transform:uppercase;letter-spacing:2px;">2026 · ${groupLabel} TEACHER SCHEDULE</div>
        <div style="font-size:17pt;font-weight:bold;text-transform:uppercase;margin:6pt 0;color:white;">${teacher.name.toUpperCase()}</div>
        ${hrs ? `<div style="font-size:9pt;color:#cbd5e1;">Weekly Teaching Hours: ${hrs}</div>` : ""}
      </td>
    </tr></table>
    <table width="100%" style="border-collapse:collapse;">
      <thead><tr><th ${th}>TIME</th>${DAYS.map(d=>`<th ${th}>${d}</th>`).join("")}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table width="100%" style="margin-top:14pt;"><tr>
      <td style="width:20%;"></td>
      <td style="border-top:1pt solid #94a3b8;text-align:center;padding-top:4pt;font-size:9pt;font-weight:bold;">Academic Coordination</td>
      <td style="width:20%;"></td>
      <td style="border-top:1pt solid #94a3b8;text-align:center;padding-top:4pt;font-size:9pt;font-weight:bold;">General Direction</td>
      <td style="width:20%;"></td>
    </tr></table>
  </div>`;
}

const PRINT_CSS = `
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#f1f5f9;}
@page{size:A4 landscape;margin:8mm;}
.page{
  page-break-after:always;
  break-after:page;
  padding:10px 12px;
  background:white;
  margin-bottom:24px;
  border-bottom:4px dashed #94a3b8;
}
.page:last-child{page-break-after:auto;break-after:auto;border-bottom:none;margin-bottom:0;}
.hdr{background:#1e3a5f!important;color:white!important;text-align:center;padding:10px;margin-bottom:8px;border-radius:4px;}
.hdr-sub{font-size:9px;color:#93c5fd!important;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
.hdr-name{font-size:17px;font-weight:bold;text-transform:uppercase;margin:4px 0;color:white!important;}
.hdr-info{font-size:10px;color:#cbd5e1!important;margin-top:3px;}
table{width:100%;border-collapse:collapse;font-size:10px;}
th{background:#1e3a5f!important;color:white!important;padding:6px 4px;text-align:center;font-size:9px;font-weight:bold;letter-spacing:0.5px;}
td{border:1px solid #d1d5db;padding:5px 4px;text-align:center;vertical-align:middle;min-height:28px;}
td.time{font-weight:bold;font-size:9px;color:#1e3a5f;white-space:nowrap;width:72px;background:#f8fafc;text-align:left;padding-left:6px;}
td.time span{display:block;font-weight:normal;font-size:8px;color:#94a3b8;margin-top:1px;}
.sp{font-weight:bold;font-size:9px;text-transform:uppercase;padding:2px;}
.reg{color:#2563eb!important;background:#eff6ff!important;}
.brk{color:white!important;background:#1e3a5f!important;}
.lnc{color:#92400e!important;background:#fef3c7!important;}
.dep{color:white!important;background:#1e3a5f!important;}
.entry{margin:1px 0;}
.grade{font-weight:bold;font-size:9px;color:#1e3a5f;}
.subj{font-size:9px;color:#374151;}
.sigs{display:flex;justify-content:space-between;padding:0 30px;margin-top:14px;}
.sig{border-top:1px solid #94a3b8;width:160px;text-align:center;padding-top:4px;font-size:9px;font-weight:bold;color:#374151;}
.duty{display:inline-block;background:#0ea5e9!important;color:white!important;font-size:7.5px;font-weight:bold;padding:1px 4px;border-radius:3px;margin-top:2px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@media print{
  html,body{background:white!important;}
  .page{border-bottom:none!important;margin-bottom:0!important;background:white!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{page-break-after:always;break-after:page;}
  .page:last-child{page-break-after:auto;break-after:auto;}
}
`;

export default function TeacherSchedulePage() {
  const { canManage } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedId, setSelectedId] = useState<string>(
    () => (typeof window !== "undefined" ? localStorage.getItem("teacherSchedule_selectedId") ?? "" : "")
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingImages, setExportingImages] = useState(false);
  const [teacherGroups, setTeacherGroups] = useState<Record<string, "MIDDLE" | "HIGH" | "MIXED" | "OTHER">>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSubject, setShowSubject] = useState(false);
  const [supervisionDuties, setSupervisionDuties] = useState<SupervisionDuty[]>([]);

  useEffect(() => {
    if (selectedId) localStorage.setItem("teacherSchedule_selectedId", selectedId);
  }, [selectedId]);

  useEffect(() => {
    fetch("/api/teachers")
      .then(r => r.json())
      .then((data: Teacher[]) => {
        const sec = data.filter(t => t.level === "LOW_SECONDARY" || t.level === "SECONDARY" || t.level === "BOTH").sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(sec);
        const saved = typeof window !== "undefined" ? localStorage.getItem("teacherSchedule_selectedId") : null;
        const valid = saved && sec.some(t => t.id === saved);
        if (!valid && sec.length > 0) setSelectedId(sec[0].id);
      })
      .catch(() => toast.error("Error loading teachers"));
    fetch("/api/time-blocks").then(r => r.json()).then(setTimeBlocks).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/assignments?teacherId=${selectedId}`)
      .then(r => r.json())
      .then((data: Assignment[]) => {
        setAssignments(data);
        setTeacherGroups(prev => ({ ...prev, [selectedId]: getTeacherGroup(data) }));
      })
      .catch(() => toast.error("Error loading schedule"))
      .finally(() => setLoading(false));
    fetch(`/api/supervision-duties?teacherId=${selectedId}`)
      .then(r => r.json())
      .then(setSupervisionDuties)
      .catch(() => {});
  }, [selectedId]);

  const exportAllImages = async (filter: "ALL" | "MIDDLE" | "HIGH") => {
    setExportingImages(true);
    const styleEl = document.createElement("style");
    styleEl.textContent = PRINT_CSS;
    document.head.appendChild(styleEl);
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1400px;background:white;z-index:-1;";
    document.body.appendChild(container);
    try {
      const allDutiesRaw = await fetch("/api/supervision-duties").then(r => r.json()).catch(() => []);
      const allDuties: SupervisionDuty[] = Array.isArray(allDutiesRaw) ? allDutiesRaw : [];
      const sorted = [...teachers].sort((a, b) => a.name.localeCompare(b.name));
      for (const teacher of sorted) {
        const asgns: Assignment[] = await fetch(`/api/assignments?teacherId=${teacher.id}`).then(r => r.json());
        if (!asgns.length) continue;
        const group = getTeacherGroup(asgns);
        if (group === "OTHER") continue;
        if (filter === "MIDDLE" && group !== "MIDDLE" && group !== "MIXED") continue;
        if (filter === "HIGH" && group !== "HIGH" && group !== "MIXED") continue;
        const duties = allDuties.filter(d => d.teacher?.id === teacher.id);
        container.innerHTML = buildTeacherPage(teacher, asgns, timeBlocks, showSubject, duties);
        await new Promise(r => setTimeout(r, 120));
        const pageEl = container.querySelector(".page") as HTMLElement;
        if (!pageEl) continue;
        const dataUrl = await toPng(pageEl, { backgroundColor: "white", pixelRatio: 2 });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${teacher.name.replace(/\s+/g, "_")}_Schedule_2026.png`;
        a.click();
        await new Promise(r => setTimeout(r, 400));
      }
      toast.success("Images exported!");
    } catch (e) {
      toast.error("Error exporting images");
    } finally {
      document.body.removeChild(container);
      document.head.removeChild(styleEl);
      setExportingImages(false);
    }
  };

  const exportAll = async (filter: "ALL" | "MIDDLE" | "HIGH") => {
    setExporting(true);
    try {
      const allDutiesRaw = await fetch("/api/supervision-duties").then(r => r.json()).catch(() => []);
      const allDuties: SupervisionDuty[] = Array.isArray(allDutiesRaw) ? allDutiesRaw : [];

      const pages: any[] = [];
      await Promise.all(
        teachers.map(async (teacher) => {
          const asgns: Assignment[] = await fetch(`/api/assignments?teacherId=${teacher.id}`).then(r => r.json());
          if (!asgns.length) return;
          const group = getTeacherGroup(asgns);
          if (group === "OTHER") return;
          if (filter === "MIDDLE" && group !== "MIDDLE" && group !== "MIXED") return;
          if (filter === "HIGH" && group !== "HIGH" && group !== "MIXED") return;
          const duties = allDuties.filter(d => d.teacher?.id === teacher.id);
          pages.push({ teacher, asgns, group, duties });
        })
      );

      const sortedPages = pages.sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));
      const htmlPages = sortedPages.map(({ teacher, asgns, duties }) => buildTeacherPage(teacher, asgns, timeBlocks, showSubject, duties));

      if (!htmlPages.length) { toast.error("No teachers found for that filter."); return; }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body>${htmlPages.join("")}</body></html>`;
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 800);
      }
    } finally {
      setExporting(false);
    }
  };

  const exportWord = async (filter: "ALL" | "MIDDLE" | "HIGH") => {
    setExportingWord(true);
    try {
      const allDutiesRaw = await fetch("/api/supervision-duties").then(r => r.json()).catch(() => []);
      const allDuties: SupervisionDuty[] = Array.isArray(allDutiesRaw) ? allDutiesRaw : [];

      const pages: any[] = [];
      await Promise.all(teachers.map(async (teacher) => {
        const asgns: Assignment[] = await fetch(`/api/assignments?teacherId=${teacher.id}`).then(r => r.json());
        if (!asgns.length) return;
        const group = getTeacherGroup(asgns);
        if (group === "OTHER") return;
        if (filter === "MIDDLE" && group !== "MIDDLE" && group !== "MIXED") return;
        if (filter === "HIGH" && group !== "HIGH" && group !== "MIXED") return;
        const duties = allDuties.filter(d => d.teacher?.id === teacher.id);
        pages.push({ teacher, asgns, duties });
      }));
      if (!pages.length) { toast.error("No teachers found."); return; }
      const sorted = pages.sort((a, b) => a.teacher.name.localeCompare(b.teacher.name));
      const body = sorted.map(({ teacher, asgns, duties }) => buildWordPage(teacher, asgns, timeBlocks, showSubject, duties)).join("");
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;}@page Section1{size:842pt 595pt;mso-page-orientation:landscape;}div.Section1{page:Section1;}</style></head><body><div class="Section1">${body}</div></body></html>`;
      const blob = new Blob([html], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Teacher_Schedules_${filter === "MIDDLE" ? "Middle" : filter === "HIGH" ? "High" : "Secondary"}_2026.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingWord(false);
    }
  };

  const exportWordSingle = () => {
    if (!selectedId) return;
    const teacher = teachers.find(t => t.id === selectedId);
    if (!teacher) return;
    const body = buildWordPage(teacher, assignments, timeBlocks, showSubject, supervisionDuties);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;}@page Section1{size:842pt 595pt;mso-page-orientation:landscape;}div.Section1{page:Section1;}</style></head><body><div class="Section1">${body}</div></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${teacher.name.replace(/\s+/g,"_")}_Schedule_2026.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printSingle = () => {
    if (!selectedId) return;
    const teacher = teachers.find(t => t.id === selectedId);
    if (!teacher) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body>${buildTeacherPage(teacher, assignments, timeBlocks, showSubject, supervisionDuties)}</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 800); }
  };

  const selectedTeacher = teachers.find(t => t.id === selectedId);
  const group = selectedId ? teacherGroups[selectedId] : undefined;
  const groupLabel = group === "MIDDLE" ? "Middle School" : group === "HIGH" ? "High School" : group === "MIXED" ? "Middle & High" : group === "OTHER" ? "Other" : "";

  const filtered = teachers.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Schedules</h1>
          <p className="text-muted-foreground">View and export secondary teacher schedules</p>
        </div>
        {canManage && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-400 self-center">PRINT:</span>
              <Button onClick={() => exportAll("MIDDLE")} disabled={exporting || exportingWord} variant="outline" className="gap-2 border-lime-500 text-lime-700 hover:bg-lime-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Middle
              </Button>
              <Button onClick={() => exportAll("HIGH")} disabled={exporting || exportingWord} variant="outline" className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                High
              </Button>
              <Button onClick={() => exportAll("ALL")} disabled={exporting || exportingWord} variant="outline" className="gap-2 border-slate-500 text-slate-700 hover:bg-slate-50">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                All Secondary
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-400 self-center">IMG:</span>
              <Button onClick={() => exportAllImages("MIDDLE")} disabled={exporting || exportingWord || exportingImages} variant="outline" className="gap-2 border-lime-500 text-lime-700 hover:bg-lime-50">
                {exportingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                Middle
              </Button>
              <Button onClick={() => exportAllImages("HIGH")} disabled={exporting || exportingWord || exportingImages} variant="outline" className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50">
                {exportingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                High
              </Button>
              <Button onClick={() => exportAllImages("ALL")} disabled={exporting || exportingWord || exportingImages} variant="outline" className="gap-2 border-slate-500 text-slate-700 hover:bg-slate-50">
                {exportingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                All Secondary
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-400 self-center">WORD:</span>
              <Button onClick={() => exportWord("MIDDLE")} disabled={exporting || exportingWord} variant="outline" className="gap-2 border-lime-500 text-lime-700 hover:bg-lime-50">
                {exportingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Middle
              </Button>
              <Button onClick={() => exportWord("HIGH")} disabled={exporting || exportingWord} variant="outline" className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50">
                {exportingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                High
              </Button>
              <Button onClick={() => exportWord("ALL")} disabled={exporting || exportingWord} variant="outline" className="gap-2 border-slate-500 text-slate-700 hover:bg-slate-50">
                {exportingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                All Secondary
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="w-52 shrink-0 space-y-2">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teacher..."
            className="w-full text-sm border rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800"
          />
          <div className="flex flex-col gap-0.5 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map(teacher => {
              const grp = teacherGroups[teacher.id];
              const badge = grp === "MIDDLE" ? "M" : grp === "HIGH" ? "H" : grp === "MIXED" ? "M+H" : null;
              const isSelected = teacher.id === selectedId;
              return (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedId(teacher.id)}
                  className={`text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center justify-between gap-1 ${isSelected ? "bg-blue-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"}`}
                >
                  <span className="font-medium truncate">{teacher.name}</span>
                  {badge && (
                    <span className={`shrink-0 text-[10px] px-1 rounded font-bold ${isSelected ? "bg-blue-400 text-white" : "bg-slate-200 text-slate-600"}`}>{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : selectedTeacher ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selectedTeacher.name}</h2>
                  {groupLabel && <span className="text-sm text-slate-500">{groupLabel}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                    <input type="checkbox" checked={showSubject} onChange={e => setShowSubject(e.target.checked)} className="rounded" />
                    Show subject
                  </label>
                  <Button variant="outline" size="sm" onClick={printSingle} className="gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportWordSingle} className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50">
                    <Download className="w-3.5 h-3.5" />
                    Word
                  </Button>
                </div>
              </div>
              <ScheduleGrid assignments={assignments} timeBlocks={timeBlocks} viewType="teacher" showSubject={showSubject} supervisionDuties={supervisionDuties} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">Select a teacher</div>
          )}
        </div>
      </div>
    </div>
  );
}
