import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
const c = (row: any[], i: number) => String(row[i] ?? "").replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();

// RRS block is at col 8 (col[8]=timeCol, cols 9-13=days)
for (let r = 265; r < 295 && r < rows.length; r++) {
  const row = rows[r] ?? [];
  const t = c(row, 7);
  const d1 = c(row, 8); const d2 = c(row, 9); const d3 = c(row, 10); const d4 = c(row, 11); const d5 = c(row, 12);
  const parts = [[d1,d2,d3,d4,d5].filter(x=>x).map((v,i)=>`D${i+1}="${v}"`).join("  ")].join("");
  if (c(row,8).toLowerCase().includes("www")) break;
  if (t || d1 || d2 || d3 || d4 || d5) console.log(`Row ${r} | time="${t}" | ${parts}`);
}
