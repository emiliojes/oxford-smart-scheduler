"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { Upload, Download, FileText, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportSchedulePage() {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [clearLevel, setClearLevel] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvContent(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) { toast.error("Selecciona un archivo CSV primero"); return; }
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/schedule/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvContent, clearLevel: clearLevel === "none" ? undefined : clearLevel }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Error al importar"); return; }
      setResult(data);
      if (data.errors?.length === 0) toast.success(`${data.imported} asignaciones importadas correctamente`);
      else toast.warning(`${data.imported} importadas, ${data.skipped} omitidas`);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const previewRows = csvContent
    ? csvContent.split("\n").filter(Boolean).slice(0, 6)
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/schedule/generate"><ArrowLeft className="w-4 h-4 mr-1" />Volver</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar Horario</h1>
          <p className="text-muted-foreground">Carga un archivo CSV con las asignaciones del horario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Download template */}
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">1</span>
              Descargar plantilla
            </CardTitle>
            <CardDescription>Usa esta plantilla CSV como base para ingresar el horario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">
              <p className="font-bold text-slate-800 mb-1">Columnas requeridas:</p>
              <p>teacher, subject, grade, section,</p>
              <p>room, day, start_time</p>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Ejemplo de fila:</p>
              <p>Irlanda Tuñon, English, 1, A,</p>
              <p>Salon 1, Monday, 07:30</p>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
              <p><strong>day:</strong> Monday, Tuesday, Wednesday, Thursday, Friday</p>
              <p><strong>start_time:</strong> formato 24h — 07:30, 08:30, 09:45...</p>
              <p><strong>section:</strong> A, B, C (dejar vacío si no aplica)</p>
            </div>
            <Button asChild variant="outline" className="w-full gap-2">
              <a href="/schedule-template.csv" download>
                <Download className="w-4 h-4" />
                Descargar plantilla CSV
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Upload and import */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Subir e importar
            </CardTitle>
            <CardDescription>Selecciona tu archivo CSV completado y ejecuta la importación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Optional: clear level before import */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Limpiar nivel antes de importar (opcional)</label>
              <Select value={clearLevel} onValueChange={setClearLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No limpiar — agregar/actualizar</SelectItem>
                  <SelectItem value="PRIMARY">Limpiar Primaria (K-5°)</SelectItem>
                  <SelectItem value="LOW_SECONDARY">Limpiar Pre-Media (6°-8°)</SelectItem>
                  <SelectItem value="SECONDARY">Limpiar Media (9°-12°)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File picker */}
            <div
              className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              {fileName ? (
                <p className="text-sm font-medium text-blue-700">{fileName}</p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Haz clic para seleccionar un archivo .csv</p>
              )}
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </div>

            <Button className="w-full gap-2" onClick={handleImport} disabled={isLoading || !csvContent}>
              {isLoading ? (
                <><span className="animate-spin mr-2">⏳</span>Importando...</>
              ) : (
                <><Upload className="w-4 h-4" />Importar horario</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      {previewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Vista previa del archivo ({csvContent.split("\n").filter(Boolean).length - 1} filas de datos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                {previewRows.map((row, i) => (
                  <tr key={i} className={i === 0 ? "font-bold bg-slate-100 dark:bg-slate-700" : "border-t"}>
                    {row.split(",").map((cell, j) => (
                      <td key={j} className="px-2 py-1">{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </table>
              {csvContent.split("\n").filter(Boolean).length > 6 && (
                <p className="text-xs text-slate-400 mt-2">...y {csvContent.split("\n").filter(Boolean).length - 6} filas más</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className={result.errors.length === 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {result.errors.length === 0
                ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                : <AlertCircle className="w-5 h-5 text-amber-600" />}
              Resultado de la importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-6 text-sm">
              <span className="text-green-700 font-semibold">✅ {result.imported} importadas</span>
              {result.skipped > 0 && <span className="text-amber-700 font-semibold">⚠️ {result.skipped} omitidas</span>}
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-800 bg-amber-100 px-2 py-1 rounded">{err}</p>
                ))}
              </div>
            )}
            {result.imported > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/schedule">Ver horario →</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


