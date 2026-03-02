import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

// Show Andrea Concepcion full block
console.log("=== Andrea Concepcion block ===");
for (let r = 22; r <= 38; r++) {
  const row = rows[r] ?? [];
  const cols = row.map((c: any, i: number) => `[${i}]="${String(c).trim()}"`).filter((s: string) => !s.includes('""')).join("  ");
  if (cols) console.log(`Row ${r}: ${cols}`);
}

// For each teacher block, show the lunch row with teacher name
const DAYS2 = ["Mon","Tue","Wed","Thu","Fri"];
console.log("=== Lunch duties per teacher ===");
for (let r = 0; r < rows.length; r++) {
  const row = rows[r] ?? [];
  // Find teacher header rows (col1 or col8 has HRS)
  const col1 = String(row[1] ?? "").trim();
  const col8 = String(row[8] ?? "").trim();
  const nameMatch1 = col1.match(/^([A-ZÁÉÍÓÚÑÜ\s\.]+?)\s{2,}/i);
  const nameMatch8 = col8.match(/^([A-ZÁÉÍÓÚÑÜ\s\.]+?)\s{2,}/i);
  
  // Look for TIME row and then lunch row
  for (const [col, nameMatch] of [[1, nameMatch1], [8, nameMatch8]] as any[]) {
    if (!nameMatch || !col1.toUpperCase().includes("HRS") && !col8.toUpperCase().includes("HRS")) continue;
    const dataStart = col === 1 ? 1 : 8;
    const timeCol = col === 1 ? 0 : 7;
    // Find TIME header
    for (let tr = r + 1; tr <= r + 5 && tr < rows.length; tr++) {
      if (String((rows[tr] ?? [])[timeCol] ?? "").trim().toUpperCase() === "TIME") {
        // Scan for lunch row
        for (let lr = tr + 1; lr < tr + 20 && lr < rows.length; lr++) {
          const lrow = rows[lr] ?? [];
          const timeStr = String(lrow[timeCol] ?? "").trim();
          if (timeStr.toLowerCase().includes("www")) break;
          const cells = Array.from({length:5}, (_,i) => String(lrow[dataStart+i] ?? "").trim());
          if (cells.some(c => /lunch|dismissal/i.test(c))) {
            const teacherName = String((rows[r] ?? [])[col] ?? "").trim().slice(0, 30);
            const duties = cells.map((c,i) => /supervision|duty/i.test(c) ? `${DAYS2[i]}(DUTY)` : /lunch/i.test(c) ? `${DAYS2[i]}(free)` : /dismissal/i.test(c) ? `${DAYS2[i]}(DISMISSAL)` : "").filter(Boolean);
            console.log(`  ${teacherName.slice(0,25).padEnd(25)} ${timeStr.padEnd(15)} ${duties.join(" ")}`);
          }
        }
        break;
      }
    }
  }
}
