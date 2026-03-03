import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

const c = (row: any[], i: number) => String(row[i] ?? "").replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();

// Row 219 is the header of the dedicated RRS block - show it and next 20 rows
for (let r = 219; r < 245 && r < rows.length; r++) {
  const row = rows[r] ?? [];
  const t = c(row, 0);
  const cells = [1,2,3,4,5,6,7,8,9,10].map(i => c(row,i)).filter(x=>x);
  if (t.toLowerCase().includes("www")) break;
  console.log(`Row ${r} | time="${t}" | ${cells.map((v,i)=>`D${i+1}="${v}"`).join("  ")}`);
}
