import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

const c = (row: any[], i: number) => String(row[i] ?? "").replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();

// Search for "MUSIC" or "ADOLFO" anywhere in all rows
for (let r = 0; r < rows.length; r++) {
  const row = rows[r] ?? [];
  for (let ci = 0; ci < 20; ci++) {
    const v = c(row, ci).toUpperCase();
    if (v.includes("MUSIC ADOLFO") || v.includes("ADOLFO MUSIC") || (v.includes("MUSIC") && v.length < 30)) {
      console.log(`Row ${r} col ${ci}: "${c(row, ci)}"`);
    }
  }
}
