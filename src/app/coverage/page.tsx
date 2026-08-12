"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserX, Printer, Search, StickyNote, Plus, X } from "lucide-react";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────
interface Teacher { id: string; name: string; level: string; }
interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { name: string };
  grade: { name: string; section: string | null; level: string } | null;
  room: { name: string } | null;
  timeBlock: { id: string; dayOfWeek: number; startTime: string; endTime: string; blockType: string; };
}

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

interface AvailableTeacher { teacher: Teacher; freeCount: number; }

function fmt(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function displaySubj(n: string) {
  return n.replace("Physical Education", "P.E.").replace("Language Arts", "L.Arts");
}

// ── Print CSS ──────────────────────────────────────────────────────
const COVERAGE_CSS = `
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{padding:28px 32px;background:white;color:#1e293b;}
.school{font-size:11px;font-weight:bold;color:#475569;text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;border-bottom:2px solid #1e3a5f;padding-bottom:8px;}
.hdr{background:#1e3a5f !important;color:white !important;padding:18px 24px;border-radius:6px;margin-bottom:20px;}
.hdr-label{font-size:10px;color:#93c5fd !important;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
.hdr-name{font-size:26px;font-weight:bold;margin:5px 0 3px;text-transform:uppercase;letter-spacing:1px;}
.hdr-info{font-size:12px;color:#cbd5e1 !important;margin-top:2px;}
.hdr-info strong{color:white !important;}
table{width:100%;border-collapse:collapse;font-size:12.5px;border:2px solid #1e3a5f;}
th{background:#1e3a5f !important;color:white !important;padding:9px 12px;text-align:left;
   font-size:11px;font-weight:bold;letter-spacing:.8px;text-transform:uppercase;border-right:1px solid #2d5080;}
td{border:1px solid #cbd5e1;padding:9px 12px;vertical-align:middle;}
tr:nth-child(even) td{background:#f1f5f9 !important;}
td.time{font-weight:bold;color:#1e3a5f;white-space:nowrap;width:155px;border-right:2px solid #cbd5e1;}
td.grade{font-weight:bold;color:#1e3a5f;}
td.room{color:#475569;font-size:12px;}
td.sub{font-weight:bold;color:#15803d !important;background:#f0fdf4 !important;}
td.empty{color:#94a3b8;font-style:italic;}
.footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:36px;}
.note{font-size:10px;color:#94a3b8;}
.sig-row{display:flex;gap:60px;}
.sig{border-top:1.5px solid #374151;min-width:180px;text-align:center;padding-top:6px;font-size:11px;font-weight:bold;color:#374151;}
@media print{body{padding:12px 16px;}@page{margin:1.2cm;size:A4;}}
`;

const SLIPS_CSS = `
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{background:white;padding:14px;}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.slip{border:2px solid #1e3a5f;border-radius:7px;overflow:hidden;break-inside:avoid;page-break-inside:avoid;}
.slip-hdr{background:#1e3a5f !important;color:white !important;padding:10px 14px;}
.slip-label{font-size:9px;color:#93c5fd !important;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;}
.slip-name{font-size:15px;font-weight:bold;text-transform:uppercase;margin:3px 0 2px;}
.slip-sub{font-size:10px;color:#bfdbfe !important;}
.slip-body{padding:10px 14px;}
.slip-row{display:flex;align-items:baseline;gap:6px;padding:5px 0;border-bottom:1px solid #e2e8f0;font-size:11px;}
.slip-row:last-child{border-bottom:none;}
.slip-time{font-weight:bold;color:#1e3a5f;white-space:nowrap;min-width:118px;font-size:10.5px;border-right:1px solid #e2e8f0;padding-right:6px;}
.slip-grade{font-weight:bold;color:#1e3a5f;min-width:52px;}
.slip-subj{color:#1e293b;font-weight:500;flex:1;}
.slip-room{font-size:9.5px;color:#64748b;white-space:nowrap;}
.slip-absent{font-size:9px;color:#94a3b8;font-style:italic;}
.sig-area{border-top:1.5px dashed #94a3b8;margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;}
.sig-line{border-top:1px solid #374151;width:108px;text-align:center;padding-top:4px;font-weight:bold;color:#374151;font-size:9px;text-transform:uppercase;letter-spacing:.5px;}
@media print{body{padding:8px;}@page{margin:0.8cm;size:A4;}}
`;

// ── Component ──────────────────────────────────────────────────────
export default function CoveragePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [searching, setSearching] = useState(false);

  // Multiple absent teachers support
  const [absentIds, setAbsentIds] = useState<string[]>([""]);  
  const [selectedDay, setSelectedDay] = useState<number>(
    () => { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d : 1; }
  );

  const [absentPeriods, setAbsentPeriods] = useState<Assignment[]>([]);
  const [availableMap, setAvailableMap] = useState<Record<string, AvailableTeacher[]>>({});
  // key = `${absentTeacherId}_${startTime}` to avoid collisions
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/teachers")
      .then(r => r.json())
      .then(t => setTeachers(
        t.filter((x: any) => x.level !== "PRIMARY")
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
      ))
      .catch(() => toast.error("Error loading teachers"))
      .finally(() => setLoadingInit(false));
  }, []);

  const validAbsentIds = absentIds.filter(Boolean);

  const handleSearch = async () => {
    if (!validAbsentIds.length) { toast.error("Select at least one absent teacher"); return; }
    setSearching(true);
    try {
      // 1. Fetch all absent teachers' assignments in parallel
      const absentAsgnsAll = await Promise.all(
        validAbsentIds.map(id => fetch(`/api/assignments?teacherId=${id}`).then(r => r.json()).catch(() => []))
      );
      const dayPeriods: Assignment[] = absentAsgnsAll
        .flat()
        .filter((a: Assignment) => a.timeBlock.dayOfWeek === selectedDay && a.timeBlock.blockType === "CLASS")
        .sort((a: Assignment, b: Assignment) =>
          a.teacher.id === b.teacher.id
            ? a.timeBlock.startTime.localeCompare(b.timeBlock.startTime)
            : a.teacher.name.localeCompare(b.teacher.name)
        );

      if (!dayPeriods.length) {
        toast.info(`No classes found on ${DAY_NAMES[selectedDay]} for the selected teachers.`);
        setAbsentPeriods([]); setAvailableMap({}); setSelections({}); setSearched(true);
        return;
      }

      // 2. Fetch all other (non-absent) teachers' assignments
      const others = teachers.filter(t => !validAbsentIds.includes(t.id));
      const allOtherAsgns = await Promise.all(
        others.map(t => fetch(`/api/assignments?teacherId=${t.id}`).then(r => r.json()).catch(() => []))
      );

      // 3. Build busy map: teacherId → Set of startTimes on selectedDay
      const busyMap = new Map<string, Set<string>>();
      allOtherAsgns.forEach((asgns: Assignment[], idx) => {
        const tid = others[idx].id;
        busyMap.set(tid, new Set(
          asgns.filter(a => a.timeBlock.dayOfWeek === selectedDay).map(a => a.timeBlock.startTime)
        ));
      });

      // 4. Total distinct class slots on this day (to compute free hours)
      const totalSlots = new Set(
        allOtherAsgns.flat()
          .filter((a: Assignment) => a.timeBlock.dayOfWeek === selectedDay && a.timeBlock.blockType === "CLASS")
          .map((a: Assignment) => a.timeBlock.startTime)
      ).size || 1;

      // 5. For each period find free teachers sorted by most free hours first
      const available: Record<string, AvailableTeacher[]> = {};
      for (const p of dayPeriods) {
        const key = `${p.teacher.id}_${p.timeBlock.startTime}`;
        available[key] = others
          .filter(t => !busyMap.get(t.id)?.has(p.timeBlock.startTime))
          .map(t => ({ teacher: t, freeCount: totalSlots - (busyMap.get(t.id)?.size ?? 0) }))
          .sort((a, b) => b.freeCount - a.freeCount);
      }

      setAbsentPeriods(dayPeriods);
      setAvailableMap(available);
      setSelections({});
      setSearched(true);
    } catch {
      toast.error("Error searching coverage");
    } finally {
      setSearching(false);
    }
  };

  const assignedCount = Object.values(selections).filter(Boolean).length;
  const dateStr = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const printReport = () => {
    if (!validAbsentIds.length) return;
    // Group periods by absent teacher
    const grouped = new Map<string, Assignment[]>();
    for (const p of absentPeriods) {
      if (!grouped.has(p.teacher.id)) grouped.set(p.teacher.id, []);
      grouped.get(p.teacher.id)!.push(p);
    }
    const sections = Array.from(grouped.entries()).map(([tid, periods]) => {
      const tName = periods[0].teacher.name;
      const rows = periods.map(p => {
        const key = `${tid}_${p.timeBlock.startTime}`;
        const sub = selections[key] ? teachers.find(t => t.id === selections[key]) : null;
        const gradeStr = p.grade ? `Grade ${p.grade.name}${p.grade.section ?? ""}` : "—";
        return `<tr>
          <td class="time">${fmt(p.timeBlock.startTime)} — ${fmt(p.timeBlock.endTime)}</td>
          <td class="grade">${gradeStr}</td>
          <td>${displaySubj(p.subject.name)}</td>
          <td class="room">${p.room?.name ?? "—"}</td>
          <td class="${sub ? "sub" : "empty"}">${sub ? sub.name : "Not assigned"}</td>
        </tr>`;
      }).join("");
      return `<div class="hdr">
        <div class="hdr-label">Coverage Report</div>
        <div class="hdr-name">${tName}</div>
        <div class="hdr-info">Day: <strong>${DAY_NAMES[selectedDay]}</strong> &nbsp;·&nbsp; ${periods.length} period(s) to cover</div>
      </div>
      <table>
        <thead><tr><th>Time</th><th>Grade</th><th>Subject</th><th>Room</th><th>Substitute Teacher</th></tr></thead>
        <tbody>${rows}</tbody>
      </table><br/>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Coverage Report — ${DAY_NAMES[selectedDay]}</title>
      <style>${COVERAGE_CSS}</style></head><body>
      <p class="school">Oxford School &nbsp;·&nbsp; Academic Year 2026</p>
      ${sections}
      <div class="footer">
        <p class="note">Generated: ${dateStr}</p>
        <div class="sig-row">
          <div class="sig">Academic Coordinator</div>
          <div class="sig">Reviewed by</div>
        </div>
      </div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
  };

  const printSlips = () => {
    if (!assignedCount) { toast.error("Assign at least one substitute first"); return; }
    // Group by substitute teacher, collecting their periods across all absent teachers
    const bySubId = new Map<string, { sub: Teacher; items: { p: Assignment; absentName: string }[] }>();
    for (const p of absentPeriods) {
      const key = `${p.teacher.id}_${p.timeBlock.startTime}`;
      const subId = selections[key];
      if (!subId) continue;
      const sub = teachers.find(t => t.id === subId);
      if (!sub) continue;
      if (!bySubId.has(subId)) bySubId.set(subId, { sub, items: [] });
      bySubId.get(subId)!.items.push({ p, absentName: p.teacher.name });
    }

    const slips = Array.from(bySubId.values()).map(({ sub, items }) => {
      const absentNames = [...new Set(items.map(i => i.absentName))].join(", ");
      const pRows = items
        .sort((a, b) => a.p.timeBlock.startTime.localeCompare(b.p.timeBlock.startTime))
        .map(({ p, absentName }) => {
          const g = p.grade ? `${p.grade.name}${p.grade.section ?? ""}` : "—";
          const showAbsent = validAbsentIds.length > 1 ? `<span class="slip-absent">(for ${absentName})</span>` : "";
          return `<div class="slip-row">
            <span class="slip-time">${fmt(p.timeBlock.startTime)} — ${fmt(p.timeBlock.endTime)}</span>
            <span class="slip-grade">${g}</span>
            <span class="slip-subj">${displaySubj(p.subject.name)}</span>
            <span class="slip-room">${p.room?.name ?? ""} ${showAbsent}</span>
          </div>`;
        }).join("");
      return `<div class="slip">
        <div class="slip-hdr">
          <div class="slip-label">Coverage Notice · ${DAY_NAMES[selectedDay]}, 2026</div>
          <div class="slip-name">${sub.name}</div>
          <div class="slip-sub">Covering for: ${absentNames}</div>
        </div>
        <div class="slip-body">${pRows}</div>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Coverage Slips — ${DAY_NAMES[selectedDay]}</title>
      <style>${SLIPS_CSS}</style></head><body>
      <div class="grid">${slips}</div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 600); }
  };

  if (loadingInit) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
          <UserX className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Coverage Finder</h1>
          <p className="text-sm text-slate-500">Find available teachers to cover an absent teacher's classes</p>
        </div>
      </div>

      {/* Search panel */}
      <Card className="p-5 space-y-4">
        {/* Absent teachers list */}
        <div>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Absent Teacher(s)</label>
          <div className="space-y-2">
            {absentIds.map((id, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={id}
                  onChange={e => { const next = [...absentIds]; next[idx] = e.target.value; setAbsentIds(next); setSearched(false); }}
                  className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">— Select teacher —</option>
                  {teachers
                    .filter(t => !absentIds.includes(t.id) || t.id === id)
                    .map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {absentIds.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-red-400 hover:bg-red-50 shrink-0"
                    onClick={() => { setAbsentIds(absentIds.filter((_, i) => i !== idx)); setSearched(false); }}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2 gap-1 text-slate-500 hover:text-slate-700"
            onClick={() => setAbsentIds([...absentIds, ""])}>
            <Plus className="w-3.5 h-3.5" /> Add another absent teacher
          </Button>
        </div>

        {/* Day + Search */}
        <div className="flex flex-wrap gap-3 items-center border-t pt-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Day</label>
            <select
              value={selectedDay}
              onChange={e => { setSelectedDay(Number(e.target.value)); setSearched(false); }}
              className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-800 dark:text-slate-100"
            >
              {[1,2,3,4,5].map(d => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-end pb-0.5">
            <Button
              onClick={handleSearch}
              disabled={searching || !validAbsentIds.length}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching…" : "Find Coverage"}
            </Button>
            {searched && absentPeriods.length > 0 && (<>
              <Button onClick={printReport} variant="outline" className="gap-2 border-slate-400">
                <Printer className="w-4 h-4" /> Full Report
              </Button>
              <Button onClick={printSlips} variant="outline" className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-50" disabled={assignedCount === 0}>
                <StickyNote className="w-4 h-4" /> Teacher Slips
              </Button>
            </>)}
          </div>
        </div>
      </Card>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          {absentPeriods.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-slate-500">
                No classes found for <strong>{validAbsentIds.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(", ")}</strong> on <strong>{DAY_NAMES[selectedDay]}</strong>.
              </p>
            </Card>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-red-600">
                    {validAbsentIds.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(", ")}
                  </span>
                  {" "}—{" "}{DAY_NAMES[selectedDay]}{" "}·{" "}{absentPeriods.length} period(s)
                </p>
                <Badge className={`text-xs ${assignedCount === absentPeriods.length ? "bg-green-600 text-white" : "bg-amber-100 text-amber-800"}`}>
                  {assignedCount}/{absentPeriods.length} assigned
                </Badge>
              </div>

              {/* Period cards */}
              {absentPeriods.map(period => {
                const selKey = `${period.teacher.id}_${period.timeBlock.startTime}`;
                const st = period.timeBlock.startTime;
                const available = availableMap[selKey] ?? [];
                const selected = selections[selKey] ?? "";
                const gradeStr = period.grade
                  ? `Grade ${period.grade.name}${period.grade.section ?? ""}`
                  : "—";
                const selectedTeacher = selected ? (availableMap[selKey]?.find(a => a.teacher.id === selected)?.teacher ?? teachers.find(t => t.id === selected)) : null;

                return (
                  <Card key={selKey} className={`p-4 border-l-4 transition-colors ${
                    selected
                      ? "border-l-green-500 bg-green-50/40 dark:bg-green-900/10"
                      : "border-l-red-400 bg-red-50/20 dark:bg-red-900/10"
                  }`}>
                    <div className="flex flex-wrap gap-4 items-center">

                      {/* Time + class info */}
                      <div className="flex-1 min-w-52 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {fmt(st)} — {fmt(period.timeBlock.endTime)}
                          </span>
                          {validAbsentIds.length > 1 && (
                            <span className="text-xs text-red-500 font-semibold">{period.teacher.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-[#1e3a5f] text-white text-xs">{gradeStr}</Badge>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            {displaySubj(period.subject.name)}
                          </span>
                          {period.room && (
                            <span className="text-xs text-slate-400">{period.room.name}</span>
                          )}
                        </div>
                      </div>

                      {/* Substitute selector */}
                      <div className="min-w-60 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 block">
                          {available.length > 0
                            ? `${available.length} teacher${available.length > 1 ? "s" : ""} available`
                            : "⚠ No teachers available"}
                        </label>
                        <select
                          value={selected}
                          onChange={e => setSelections(s => ({ ...s, [selKey]: e.target.value }))}
                          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-slate-100 ${
                            selected
                              ? "border-green-400 focus:ring-green-400 font-semibold text-green-800 dark:text-green-400"
                              : "focus:ring-red-400"
                          }`}
                        >
                          <option value="">— Not assigned —</option>
                          {available.map(({ teacher: t, freeCount }) => (
                            <option key={t.id} value={t.id}>
                              {t.name} · {freeCount} free hr{freeCount !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                        {selectedTeacher && (
                          <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                            ✓ {selectedTeacher.name} will cover this period
                          </p>
                        )}
                      </div>

                    </div>
                  </Card>
                );
              })}

              {/* Bottom print bar */}
              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={printSlips} disabled={assignedCount === 0}
                  variant="outline" className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50">
                  <StickyNote className="w-4 h-4" /> Print Teacher Slips
                </Button>
                <Button onClick={printReport} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
                  <Printer className="w-4 h-4" /> Print Full Report
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
