"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Shield, Database } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Teacher { id: string; name: string; }
interface Duty {
  id: string;
  area: string;
  startTime: string;
  endTime: string;
  dayPattern: string;
  isClosed: boolean;
  level: string;
  teacherId: string | null;
  teacher: { id: string; name: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const DAY_PATTERNS = [
  { value: "EVERYDAY",    label: "Everyday" },
  { value: "MON_TO_FRI",  label: "Mon – Fri" },
  { value: "MON_TO_THU",  label: "Mon – Thu" },
  { value: "TUE_AND_THU", label: "Tue & Thu" },
  { value: "MON",  label: "Monday" },
  { value: "TUE",  label: "Tuesday" },
  { value: "WED",  label: "Wednesday" },
  { value: "THU",  label: "Thursday" },
  { value: "FRI",  label: "Friday" },
];

const DAY_PATTERN_DAYS: Record<string, number[]> = {
  EVERYDAY:    [1, 2, 3, 4, 5],
  MON_TO_FRI:  [1, 2, 3, 4, 5],
  MON_TO_THU:  [1, 2, 3, 4],
  TUE_AND_THU: [2, 4],
  MON: [1], TUE: [2], WED: [3], THU: [4], FRI: [5],
};

function dayLabel(pattern: string) {
  return DAY_PATTERNS.find(d => d.value === pattern)?.label ?? pattern;
}

function fmt(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suf = h >= 12 ? "p.m." : "a.m.";
  const dh = h % 12 || 12;
  return `${dh}:${String(m).padStart(2, "0")} ${suf}`;
}

const LUNCH_AREAS = ["Playground Area / Ping Pong Tables", "Football Court", "Gym", "Cafeteria", "School Bus Area", "Washrooms / Downstairs"];
const BREAK_AREAS = ["Playground Area / Ping Pong Tables", "Playground Area", "Washrooms / Downstairs", "Gym"];

// ── Form defaults ──────────────────────────────────────────────────────────────
const emptyForm = {
  area: "",
  startTime: "",
  endTime: "",
  dayPattern: "MON",
  isClosed: false,
  level: "SECONDARY",
  teacherId: "",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function SupervisionPage() {
  const { canManage } = useAuth();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [tab, setTab] = useState<"overview" | "middle" | "high" | "break">("overview");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/supervision-duties").then(r => r.json()),
      fetch("/api/teachers").then(r => r.json()),
    ]).then(([d, t]) => {
      setDuties(d);
      setTeachers(t.filter((x: any) => x.level === "LOW_SECONDARY" || x.level === "SECONDARY" || x.level === "BOTH").sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }).catch(() => toast.error("Error loading data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (d: Duty) => {
    setEditId(d.id);
    setForm({
      area: d.area,
      startTime: d.startTime,
      endTime: d.endTime,
      dayPattern: d.dayPattern,
      isClosed: d.isClosed,
      level: d.level,
      teacherId: d.teacherId ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.area || !form.startTime || !form.endTime || !form.dayPattern) {
      toast.error("Fill all required fields");
      return;
    }
    if (!form.isClosed && !form.teacherId) {
      toast.error("Select a teacher or mark as Closed");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, teacherId: form.isClosed ? null : form.teacherId };
      const url = editId ? `/api/supervision-duties/${editId}` : "/api/supervision-duties";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      toast.success(editId ? "Updated" : "Created");
      setShowForm(false);
      load();
    } catch {
      toast.error("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supervision duty?")) return;
    const res = await fetch(`/api/supervision-duties/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Error deleting");
  };

  const handleSeed = async () => {
    if (!confirm("Load 2026 supervision schedule? This will fail if duties already exist.")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/supervision-duties/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Created ${data.created} duties${data.failed.length ? `, ${data.failed.length} not found` : ""}`);
      if (data.failed.length) {
        console.warn("Unmatched teachers:", data.failed);
        toast.warning(`Teachers not found: ${data.failed.map((f: any) => f.teacher).join(", ")}`, { duration: 8000 });
      }
      load();
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Delete ALL supervision duties?")) return;
    const res = await fetch("/api/supervision-duties/seed", { method: "DELETE" });
    const data = await res.json();
    toast.success(`Deleted ${data.deleted} duties`);
    load();
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const middleLunchDuties = duties.filter(d => d.startTime >= "11:00" && d.startTime < "12:00");
  const highLunchDuties   = duties.filter(d => d.startTime >= "12:00");
  const breakDuties       = duties.filter(d => d.startTime < "11:00");

  const DAYS_LABELS = ["Mon","Tue","Wed","Thu","Fri"];

  function OverviewGrid({ list, title, color }: { list: Duty[]; title: string; color: string }) {
    const areas = Array.from(new Set(list.map(d => d.area))).sort();
    if (!areas.length) return null;
    return (
      <div className="mb-6">
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${color}`}>{title}</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-3 py-2 font-semibold w-48">Area</th>
                {DAYS_LABELS.map(d => <th key={d} className="px-3 py-2 font-semibold text-center w-28">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {areas.map((area, ri) => (
                <tr key={area} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-3 py-2 font-medium text-slate-700 border-r border-slate-100 text-xs">{area}</td>
                  {[1,2,3,4,5].map(dayNum => {
                    const match = list.filter(d => d.area === area && (DAY_PATTERN_DAYS[d.dayPattern] ?? []).includes(dayNum));
                    return (
                      <td key={dayNum} className="px-2 py-1.5 text-center border-r border-slate-100 last:border-0">
                        {match.length === 0 ? <span className="text-slate-300">—</span> : match.map(d => (
                          d.isClosed
                            ? <span key={d.id} className="inline-block bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded">Closed</span>
                            : <span key={d.id} className="block text-xs font-medium text-slate-800 leading-tight">{d.teacher?.name ?? "—"}</span>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function groupByArea(list: Duty[]) {
    const map = new Map<string, Duty[]>();
    for (const d of list) {
      const key = d.area;
      map.set(key, [...(map.get(key) ?? []), d]);
    }
    return map;
  }

  const DutyList = ({ list }: { list: Duty[] }) => {
    const grouped = groupByArea(list);
    if (grouped.size === 0) {
      return <p className="text-sm text-slate-400 py-6 text-center">No duties yet</p>;
    }
    return (
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([area, items]) => {
          const sampleTime = `${fmt(items[0].startTime)} – ${fmt(items[0].endTime)}`;
          return (
            <Card key={area} className="overflow-hidden border-0 shadow-sm">
              <div className="bg-yellow-100 px-4 py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-yellow-900">{area}</span>
                  <span className="ml-3 text-xs text-yellow-700">{sampleTime}</span>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditId(null);
                    setForm({ ...emptyForm, area, startTime: items[0].startTime, endTime: items[0].endTime });
                    setShowForm(true);
                  }} className="h-7 px-2 text-yellow-700 hover:bg-yellow-200">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="divide-y">
                {items.map(d => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      {d.isClosed ? (
                        <Badge className="bg-red-500 text-white text-xs">Closed</Badge>
                      ) : (
                        <span className="font-medium text-slate-800">{d.teacher?.name ?? "—"}</span>
                      )}
                      <Badge variant="outline" className="text-xs text-slate-500">{dayLabel(d.dayPattern)}</Badge>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(d.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-orange-500" />
            Supervision Duties
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Secondary teacher supervision schedule</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={openAdd} className="gap-2 bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4" /> Add Duty
            </Button>
            {duties.length === 0 ? (
              <Button onClick={handleSeed} disabled={seeding} variant="outline" className="gap-2 border-blue-400 text-blue-700 hover:bg-blue-50">
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Load 2026 Data
              </Button>
            ) : (
              <Button onClick={handleClear} variant="outline" className="gap-2 border-red-400 text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Clear All
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
        {(["overview", "middle", "high", "break"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            {t === "overview" ? "📋 Overview" : t === "middle" ? "🟢 Middle Lunch  11:30" : t === "high" ? "🔵 High Lunch  12:45" : "☕ Morning Break"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : tab === "overview" ? (
        <div>
          <OverviewGrid list={breakDuties}       title="☕ Morning Break" color="text-amber-700" />
          <OverviewGrid list={middleLunchDuties} title="🟢 Middle School Lunch — 11:30" color="text-green-700" />
          <OverviewGrid list={highLunchDuties}   title="🔵 High School Lunch — 12:45" color="text-blue-700" />
        </div>
      ) : (
        <DutyList list={tab === "middle" ? middleLunchDuties : tab === "high" ? highLunchDuties : breakDuties} />
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold">{editId ? "Edit Duty" : "Add Duty"}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Area *</label>
                <input
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  list="areas-list"
                  placeholder="e.g. Cafeteria"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <datalist id="areas-list">
                  {[...LUNCH_AREAS, ...BREAK_AREAS].filter((v, i, a) => a.indexOf(v) === i).map(a => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Start Time *</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">End Time *</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Day Pattern *</label>
                <select value={form.dayPattern} onChange={e => setForm(f => ({ ...f, dayPattern: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {DAY_PATTERNS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isClosed" checked={form.isClosed}
                  onChange={e => setForm(f => ({ ...f, isClosed: e.target.checked, teacherId: e.target.checked ? "" : f.teacherId }))}
                  className="rounded" />
                <label htmlFor="isClosed" className="text-sm text-slate-700 cursor-pointer">Closed area (no teacher needed)</label>
              </div>

              {!form.isClosed && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Teacher *</label>
                  <select value={form.teacherId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="">— Select teacher —</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
