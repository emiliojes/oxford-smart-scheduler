import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Print rows 126-135 (Vanessa Munoz block)
console.log("=== Rows 126-135 ===");
for (let r = 126; r <= 135; r++) {
  const row = rows[r] ?? [];
  const cols = row.map((c: any, i: number) => `[${i}]="${String(c).trim()}"`).filter((s: string) => !s.includes('""')).join("  ");
  if (cols) console.log(`Row ${r}: ${cols}`);
}
