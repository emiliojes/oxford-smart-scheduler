import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Show rows with LUNCH or DISMISSAL content
console.log("=== Lunch / Dismissal rows ===");
for (let r = 0; r < rows.length; r++) {
  const row = rows[r] ?? [];
  const line = row.map((c: any, i: number) => `[${i}]="${String(c).trim()}"`).filter((s: string) => !s.includes('""')).join("  ");
  if (/lunch|dismissal|salida/i.test(line)) console.log(`Row ${r}: ${line}`);
}
