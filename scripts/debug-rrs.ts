import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Show the dedicated Resource Room Support block starting at row 198 (col 1)
// which has cells like "MUSIC ADOLFO", "SPANISH ARACELLYS", etc.
const TARGET_ROW = 198;
console.log(`\n=== Resource Room Support block (rows ${TARGET_ROW} to ${TARGET_ROW+20}) ===`);
for (let r = TARGET_ROW; r < TARGET_ROW + 20 && r < rows.length; r++) {
  const row = rows[r] ?? [];
  const timeVal = String(row[0] ?? "").trim();
  const d1 = String(row[1] ?? "").replace(/\s+/g, " ").trim();
  const d2 = String(row[2] ?? "").replace(/\s+/g, " ").trim();
  const d3 = String(row[3] ?? "").replace(/\s+/g, " ").trim();
  const d4 = String(row[4] ?? "").replace(/\s+/g, " ").trim();
  const d5 = String(row[5] ?? "").replace(/\s+/g, " ").trim();
  if (timeVal.toLowerCase().includes("www")) break;
  const parts = [d1,d2,d3,d4,d5].filter(x=>x).map((x,i)=>`D${i+1}="${x}"`).join("  ");
  if (timeVal || parts) console.log(`  Row ${r} time="${timeVal}"  ${parts}`);
}
