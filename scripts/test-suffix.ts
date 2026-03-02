import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
const wb = XLSX.readFile("2026 TEACHER SCHEDULES.xlsx");
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Show exact bytes in Aracellys cells
const row215 = rows[215] ?? [];
for (let i = 7; i <= 12; i++) {
  const val = String(row215[i] ?? "");
  if (val.trim()) {
    console.log(`col[${i}] len=${val.length} chars=[${[...val].map(c => c.charCodeAt(0)).join(",")}] repr="${val}"`);
    const m = val.match(/\s+(LIT|ENG\.?|SPAN|SOC\.?|SCI|BIO|CHEM|PHYS|COMP|MUS|ART|PE|P\.E\.?)$/i);
    console.log(`  suffixMatch:`, m?.[1]);
  }
}
