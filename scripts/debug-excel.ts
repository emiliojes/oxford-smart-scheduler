import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Find all block header rows (contain "GRADE" in col 0 or 7)
console.log("=== Block headers with GRADE label ===");
for (let r = 0; r < rows.length; r++) {
  const row = rows[r] ?? [];
  const col0 = String(row[0] ?? "").trim();
  const col7 = String(row[7] ?? "").trim();
  if (/GRADE/i.test(col0)) console.log(`Row ${r} col0: "${col0}"  col1: "${String(row[1] ?? "").trim().slice(0, 60)}"`);
  if (/GRADE/i.test(col7)) console.log(`Row ${r} col7: "${col7}"  col8: "${String(row[8] ?? "").trim().slice(0, 60)}"`);
}
