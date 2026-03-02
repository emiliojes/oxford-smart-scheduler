import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Print rows 4-25 (Irlanda Tuñon block) with column indices
console.log("=== Rows 4-25, all columns ===");
for (let r = 4; r <= 25; r++) {
  const row = rows[r] ?? [];
  const cols = row.map((c: any, i: number) => `[${i}]="${String(c).trim()}"`).filter((s: string) => !s.includes('""')).join("  ");
  if (cols) console.log(`Row ${r}: ${cols}`);
}

// Print rows 22-45 (Andrea/Ricardo block)
console.log("\n=== Rows 22-45 ===");
for (let r = 22; r <= 45; r++) {
  const row = rows[r] ?? [];
  const cols = row.map((c: any, i: number) => `[${i}]="${String(c).trim()}"`).filter((s: string) => !s.includes('""')).join("  ");
  if (cols) console.log(`Row ${r}: ${cols}`);
}
