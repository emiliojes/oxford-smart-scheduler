"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Plus, Trash2, Loader2, ChevronLeft, Upload } from "lucide-react";
import Link from "next/link";

interface Student { id: string; firstName: string; lastName: string; gradeId: string; }
interface Grade { id: string; name: string; section: string | null; level: string; }

function gradeLabel(g: Grade) {
  return `${g.name === "K" ? "Kinder" : "Grade " + g.name}${g.section ? " " + g.section : ""}`;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const gradeId = params.gradeId as string;

  const [grade, setGrade] = useState<Grade | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New student form
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");

  // CSV import state
  const [csvText, setCsvText] = useState("");
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "ADMIN" && user.role !== "COORDINATOR") { router.replace("/attendance"); return; }
    Promise.all([
      fetch(`/api/grades`).then(r => r.json()),
      fetch(`/api/students?gradeId=${gradeId}`).then(r => r.json()),
    ]).then(([grades, studs]) => {
      const g = grades.find((x: Grade) => x.id === gradeId);
      setGrade(g ?? null);
      setStudents(studs);
    }).catch(() => toast.error("Error loading data"))
      .finally(() => setLoading(false));
  }, [user, gradeId]);

  const addStudent = async () => {
    if (!newFirst.trim() || !newLast.trim()) { toast.error("First and last name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: newFirst.trim(), lastName: newLast.trim(), gradeId }),
      });
      const s = await res.json();
      if (res.ok) {
        setStudents(prev => [...prev, s].sort((a, b) => a.lastName.localeCompare(b.lastName)));
        setNewFirst(""); setNewLast("");
        toast.success("Student added");
      } else toast.error(s.error ?? "Error adding student");
    } catch { toast.error("Connection error"); }
    finally { setSaving(false); }
  };

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? Their attendance records will also be deleted.`)) return;
    try {
      const res = await fetch(`/api/students?id=${id}`, { method: "DELETE" });
      if (res.ok) { setStudents(prev => prev.filter(s => s.id !== id)); toast.success("Student deleted"); }
      else toast.error("Error deleting student");
    } catch { toast.error("Connection error"); }
  };

  const importCSV = async () => {
    if (!csvText.trim()) { toast.error("Paste CSV data first"); return; }
    // Parse: each line = "FirstName,LastName" or "LastName, FirstName"
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    const parsed = lines.map(line => {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length >= 2) return { firstName: parts[0], lastName: parts[1] };
      return null;
    }).filter(Boolean) as { firstName: string; lastName: string }[];

    if (parsed.length === 0) { toast.error("No valid rows found. Format: FirstName,LastName"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeId, students: parsed }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Imported ${result.imported} students`);
        setCsvText(""); setShowImport(false);
        // Refresh
        const studs = await fetch(`/api/students?gradeId=${gradeId}`).then(r => r.json());
        setStudents(studs);
      } else toast.error(result.error ?? "Import failed");
    } catch { toast.error("Connection error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Link href="/attendance"><Button variant="ghost" size="sm"><ChevronLeft className="w-4 h-4" /></Button></Link>
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Students — {grade ? gradeLabel(grade) : "Loading..."}
          </h1>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowImport(!showImport)}>
          <Upload className="w-4 h-4" /> Import CSV
        </Button>
      </div>

      {/* CSV Import */}
      {showImport && (
        <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Paste CSV — one student per line: <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">FirstName,LastName</code></p>
            <textarea
              className="w-full border rounded p-2 text-sm font-mono h-32 bg-white dark:bg-slate-800 dark:text-white"
              placeholder={"Juan,Pérez\nMaría,González\nCarlos,Rodríguez"}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={importCSV} disabled={saving} size="sm" className="gap-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Import
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowImport(false); setCsvText(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Add student */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-500 font-medium">First Name</label>
          <input
            type="text" value={newFirst} onChange={e => setNewFirst(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addStudent()}
            placeholder="Juan"
            className="w-full border rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-500 font-medium">Last Name</label>
          <input
            type="text" value={newLast} onChange={e => setNewLast(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addStudent()}
            placeholder="Pérez"
            className="w-full border rounded px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-white"
          />
        </div>
        <Button onClick={addStudent} disabled={saving} size="sm" className="gap-1 mb-0.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </Button>
      </div>

      {/* Student list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-12 h-12 mx-auto opacity-30 mb-2" />
          <p>No students yet. Add one above or import CSV.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                <th className="px-4 py-2 text-left text-slate-500 font-medium w-10">#</th>
                <th className="px-4 py-2 text-left font-semibold">Last Name</th>
                <th className="px-4 py-2 text-left font-semibold">First Name</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr key={s.id} className={`border-t ${idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}`}>
                  <td className="px-4 py-2 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium">{s.lastName}</td>
                  <td className="px-4 py-2">{s.firstName}</td>
                  <td className="px-2 py-1">
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => deleteStudent(s.id, `${s.firstName} ${s.lastName}`)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 text-xs text-slate-400 border-t">
            {students.length} student{students.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
