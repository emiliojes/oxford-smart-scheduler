"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserX, Printer, Search } from "lucide-react";
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
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
body{padding:24px;background:white;}
.hdr{background:#1e3a5f;color:white;padding:18px 24px;border-radius:8px;margin-bottom:20px;}
.hdr-label{font-size:11px;color:#93c5fd;font-weight:bold;text-transform:uppercase;letter-spacing:2px;}
.hdr-name{font-size:24px;font-weight:bold;margin:5px 0 3px;text-transform:uppercase;}
.hdr-info{font-size:13px;color:#cbd5e1;}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:4px;}
th{background:#1e3a5f;color:white;padding:9px 10px;text-align:left;font-size:12px;font-weight:bold;letter-spacing:0.5px;}
td{border:1px solid #d1d5db;padding:9px 10px;vertical-align:middle;}
td.time{font-weight:bold;color:#1e3a5f;white-space:nowrap;width:160px;background:#f8fafc;}
td.grade{font-weight:bold;color:#1e3a5f;}
td.sub{background:#f0fdf4;font-weight:bold;color:#166534;}
td.empty{color:#94a3b8;font-style:italic;}
.note{font-size:11px;color:#64748b;margin-top:14px;}
.sig-row{display:flex;justify-content:space-between;margin-top:48px;}
.sig{border-top:1px solid #94a3b8;width:200px;text-align:center;padding-top:6px;font-size:12px;font-weight:bold;color:#374151;}
@media print{body{padding:10px;}}
`;

// ── Component ──────────────────────────────────────────────────────
export default function CoveragePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [searching, setSearching] = useState(false);

  const [absentId, setAbsentId] = useState("");
  const [selectedDay, setSelectedDay] = useState<number>(
    () => {
      const d = new Date().getDay();
      return d >= 1 && d <= 5 ? d : 1;
    }
  );

  const [absentPeriods, setAbsentPeriods] = useState<Assignment[]>([]);
  const [availableMap, setAvailableMap] = useState<Record<string, Teacher[]>>({});
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

  const handleSearch = async () => {
    if (!absentId) { toast.error("Select an absent teacher"); return; }
    setSearching(true);
    try {
      // 1. Fetch absent teacher's assignments
      const absentAsgns: Assignment[] = await fetch(`/api/assignments?teacherId=${absentId}`).then(r => r.json());
      const dayPeriods = absentAsgns.filter(
        a => a.timeBlock.dayOfWeek === selectedDay && a.timeBlock.blockType === "CLASS"
      ).sort((a, b) => a.timeBlock.startTime.localeCompare(b.timeBlock.startTime));

      if (!dayPeriods.length) {
        toast.info(`No classes for this teacher on ${DAY_NAMES[selectedDay]}.`);
        setAbsentPeriods([]);
        setAvailableMap({});
        setSelections({});
        setSearched(true);
        return;
      }

      // 2. Fetch all other teachers' assignments in parallel
      const others = teachers.filter(t => t.id !== absentId);
      const allOtherAsgns = await Promise.all(
        others.map(t => fetch(`/api/assignments?teacherId=${t.id}`).then(r => r.json()).catch(() => []))
      );

      // 3. Build busy map: teacherId → Set of startTimes on selectedDay
      const busyMap = new Map<string, Set<string>>();
      allOtherAsgns.forEach((asgns: Assignment[], idx) => {
        const tid = others[idx].id;
        const busy = new Set<string>(
          asgns
            .filter(a => a.timeBlock.dayOfWeek === selectedDay)
            .map(a => a.timeBlock.startTime)
        );
        busyMap.set(tid, busy);
      });

      // 4. For each period find free teachers
      const available: Record<string, Teacher[]> = {};
      for (const p of dayPeriods) {
        const st = p.timeBlock.startTime;
        available[st] = others.filter(t => !busyMap.get(t.id)?.has(st));
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

  const absentTeacher = teachers.find(t => t.id === absentId);
  const assignedCount = Object.values(selections).filter(Boolean).length;

  const printReport = () => {
    if (!absentTeacher) return;
    const rows = absentPeriods.map(p => {
      const st = p.timeBlock.startTime;
      const sub = selections[st] ? teachers.find(t => t.id === selections[st]) : null;
      const gradeStr = p.grade ? `Grade ${p.grade.name}${p.grade.section ?? ""}` : "—";
      return `<tr>
        <td class="time">${fmt(st)} — ${fmt(p.timeBlock.endTime)}</td>
        <td class="grade">${gradeStr}</td>
        <td>${displaySubj(p.subject.name)}</td>
        <td>${p.room?.name ?? "—"}</td>
        <td class="${sub ? "sub" : "empty"}">${sub ? sub.name : "Not assigned"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Coverage Report</title>
      <style>${COVERAGE_CSS}</style></head><body>
      <div class="hdr">
        <div class="hdr-label">Coverage Report · 2026</div>
        <div class="hdr-name">${absentTeacher.name}</div>
        <div class="hdr-info">Day: <strong>${DAY_NAMES[selectedDay]}</strong> &nbsp;·&nbsp; ${absentPeriods.length} period(s) &nbsp;·&nbsp; ${assignedCount} substitute(s) assigned</div>
      </div>
      <table>
        <thead><tr><th>Time</th><th>Grade</th><th>Subject</th><th>Room</th><th>Substitute Teacher</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="note">Generated: ${new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}</p>
      <div class="sig-row">
        <div class="sig">Academic Coordinator</div>
        <div class="sig">Substitute Teacher</div>
      </div>
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
      <Card className="p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-52">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Absent Teacher</label>
            <select
              value={absentId}
              onChange={e => { setAbsentId(e.target.value); setSearched(false); }}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">— Select teacher —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
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
          <Button
            onClick={handleSearch}
            disabled={searching || !absentId}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {searching ? "Searching…" : "Find Coverage"}
          </Button>
          {searched && absentPeriods.length > 0 && (
            <Button onClick={printReport} variant="outline" className="gap-2 border-slate-400">
              <Printer className="w-4 h-4" /> Print / PDF
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          {absentPeriods.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="text-slate-500">
                No classes found for <strong>{absentTeacher?.name}</strong> on <strong>{DAY_NAMES[selectedDay]}</strong>.
              </p>
            </Card>
          ) : (
            <>
              {/* Summary bar */}
              <div className="flex items-center justify-between px-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-red-600">{absentTeacher?.name}</span>
                  {" "}—{" "}{DAY_NAMES[selectedDay]}
                  {" "}·{" "}{absentPeriods.length} period(s)
                </p>
                <Badge
                  className={`text-xs ${assignedCount === absentPeriods.length ? "bg-green-600 text-white" : "bg-amber-100 text-amber-800"}`}
                >
                  {assignedCount}/{absentPeriods.length} assigned
                </Badge>
              </div>

              {/* Period cards */}
              {absentPeriods.map(period => {
                const st = period.timeBlock.startTime;
                const available = availableMap[st] ?? [];
                const selected = selections[st] ?? "";
                const gradeStr = period.grade
                  ? `Grade ${period.grade.name}${period.grade.section ?? ""}`
                  : "—";
                const selectedTeacher = selected ? teachers.find(t => t.id === selected) : null;

                return (
                  <Card key={st} className={`p-4 border-l-4 transition-colors ${
                    selected
                      ? "border-l-green-500 bg-green-50/40 dark:bg-green-900/10"
                      : "border-l-red-400 bg-red-50/20 dark:bg-red-900/10"
                  }`}>
                    <div className="flex flex-wrap gap-4 items-center">

                      {/* Time + class info */}
                      <div className="flex-1 min-w-52 space-y-1">
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {fmt(st)} — {fmt(period.timeBlock.endTime)}
                        </span>
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
                          onChange={e => setSelections(s => ({ ...s, [st]: e.target.value }))}
                          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white dark:bg-slate-800 dark:text-slate-100 ${
                            selected
                              ? "border-green-400 focus:ring-green-400 font-semibold text-green-800 dark:text-green-400"
                              : "focus:ring-red-400"
                          }`}
                        >
                          <option value="">— Not assigned —</option>
                          {available.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
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
              <div className="flex justify-end pt-2">
                <Button onClick={printReport} className="gap-2 bg-slate-800 hover:bg-slate-700 text-white">
                  <Printer className="w-4 h-4" /> Print Coverage Report
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
