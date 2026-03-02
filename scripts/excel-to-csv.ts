import { createRequire } from "module";
const require = createRequire(import.meta.url);
const XLSX = require("xlsx");
import * as fs from "fs";
import * as path from "path";

const FILE = path.join(process.cwd(), "2026 TEACHER SCHEDULES.xlsx");
const wb = XLSX.readFile(FILE);
const ws = wb.Sheets["Hoja 1"];
const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

const c = (row: any[], col: number): string => String((row ?? [])[col] ?? "").trim();

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SKIP_WORDS = ["registration", "break", "lunch", "dismissal", "supervision", "www", "time", "07.15", "student", "arrival duty"];
const ROMAN: Record<string, string> = {
  "XII": "12", "XI": "11", "X": "10", "IX": "9",
  "VIII": "8", "VII": "7", "VI": "6", "V": "5",
  "IV": "4", "III": "3", "II": "2", "I": "1",
};

function parseGradeCell(raw: string): { grade: string; section: string; isLab: boolean } | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (SKIP_WORDS.some(s => lower.includes(s))) return null;
  const isLab = /\bLAB\b/i.test(raw);
  // Remove noise: (LAB), LAB, (T), T.S., T SK, LAB ASSISTANT, Q suffix, etc.
  let clean = raw
    .replace(/\(LAB\)/gi, "").replace(/\bLAB\b/gi, "")
    .replace(/\(T\)/gi, "").replace(/T\.S\.?/gi, "").replace(/T SK\s*\d*/gi, "")
    .replace(/LAB\s*ASSI?SS?TANT/gi, "")
    .replace(/Q$/i, "")  // e.g. "12AQ" -> "12A"
    .trim();
  // Match roman numeral or digit grade + optional section
  const m = clean.match(/^(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I|K|\d+)\s*([A-C]?)\s*$/i);
  if (!m) return null;
  const gradeRaw = m[1].toUpperCase();
  let section = m[2].toUpperCase();
  const grade = ROMAN[gradeRaw] ?? gradeRaw;
  // Grade 12 only has section A in DB — default empty section to A
  if (grade === "12" && !section) section = "A";
  return { grade, section, isLab };
}

// Map subject to lab room name
function getLabRoom(subject: string): string {
  const s = subject.toUpperCase();
  if (s.includes("BIOLOGY") || s.includes("CHEMISTRY") || s.includes("PHYSICS") || s.includes("SCIENCE")) return "Science Lab";
  if (s.includes("COMPUTING") || s.includes("COMPUTER")) return "Computer Lab";
  return "Science Lab"; // default
}

function parseStartTime(t: string): string | null {
  const m = t.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let hour = parseInt(m[1]);
  const min = m[2];
  // School hours: 7-12 = AM, 1-5 = PM (add 12)
  if (hour >= 1 && hour <= 5) hour += 12;
  return `${String(hour).padStart(2, "0")}:${min}`;
}

function mapSubject(raw: string, grade: string): string {
  const s = raw.toUpperCase();
  const g = parseInt(grade);
  if (s.includes("MATH") || s.includes("MATHS")) {
    if (g <= 8) return "Math 8";
    if (g === 9) return "Math 9";
    if (g === 10) return "Math 10";
    if (g === 11) return "Math 11";
    return "Math 12";
  }
  if (s.includes("BIOLOGY") || s === "BIO") return "Biology";
  if (s.includes("CHEM")) return "Chemistry";
  if (s.includes("PHYSICS") || s.includes("PHYS")) return "Physics";
  if (s.includes("ENGLISH")) return "English";
  if (s.includes("SPANISH") || s.includes("SPAN")) return "Spanish";
  if (s.includes("LITERATURE") || s.includes("LITER")) return "Literature";
  if (s.includes("SOCIAL")) return "Social Science";
  if ((s === "SCIENCE" || s === "SCIENCES" || s.startsWith("SCIENCE")) && !s.includes("SOCIAL")) return "Science";
  if (s.includes("COMPUTING") || s.includes("COMP")) return "Computing";
  if (s.includes("FRENCH")) return "French";
  if (s.includes("P.E") || s.includes("GYM")) return "P.E.";
  if (s.includes("MUSIC")) return "Music";
  if (s.includes("ART")) return "Arts";
  return raw;
}

// Extract teacher name from a cell like:
// "IRLANDA TUÑON      MATHS 9-12, T SK 11                          26 HRS  SALON 22"
// "ANDREA CONCEPCION       BIOLOGY 9-12    25 HRS SALON 20"
// Known subject keywords to split name from subject
const SUBJECT_KEYWORDS = ["MATH", "BIOLOGY", "CHEMISTRY", "PHYSICS", "ENGLISH", "SPANISH",
  "LITERATURE", "SOCIAL SCIENCES", "SOCIAL SCIENCE", "SOCIAL", "SCIENCE", "COMPUTING", "FRENCH", "P.E", "MUSIC", "ART", "SCIENCES"];

// Manual overrides for cells where auto-parsing fails
const TEACHER_OVERRIDES: Record<string, { name: string; subject: string }> = {
  "VANESSA": { name: "VANESSA MUÑOZ", subject: "SOCIAL SCIENCES" },
};

function extractTeacherInfo(cell: string): { name: string; subject: string } | null {
  if (!cell || !cell.toUpperCase().includes("HRS")) return null;
  // Check overrides first
  for (const [key, val] of Object.entries(TEACHER_OVERRIDES)) {
    if (cell.toUpperCase().includes(key)) return val;
  }
  // Try standard pattern: NAME  SUBJECT  XX HRS
  const m = cell.match(/^([A-ZÁÉÍÓÚÑÜÀÈÌÒÙa-záéíóúñüàèìòù\s\.]+?)\s{2,}(.+?)\s+\d+\s*HRS/i);
  if (m) {
    const name = m[1].trim().replace(/\s+/g, " ");
    const subjectRaw = m[2].trim().replace(/\s+\d+[-–]\d+.*$/i, "").replace(/,.*$/, "").replace(/;.*$/, "").trim();
    return { name, subject: subjectRaw };
  }
  // Fallback: split at first subject keyword (try longer keywords first to avoid partial matches)
  const sortedKW = [...SUBJECT_KEYWORDS].sort((a, b) => b.length - a.length);
  for (const kw of sortedKW) {
    const idx = cell.toUpperCase().indexOf(kw);
    if (idx > 2) {
      const name = cell.slice(0, idx).trim().replace(/\s+/g, " ");
      const subjectRaw = cell.slice(idx).replace(/\s+\d+[-–]\d+.*$/i, "").replace(/,.*$/, "").replace(/;.*$/, "").trim();
      if (name.length > 3 && name.length < 50) return { name, subject: subjectRaw };
    }
  }
  return null;
}

// Known invalid/non-teacher block names to skip
const SKIP_BLOCKS = ["ARTS", "GRADE ARTS", "GRADE SCIENCE", "LAB ASSISTANT"];

// Structure: each teacher block uses cols 0-5 (left) or cols 7-12 (right)
// TIME col = 0 or 7, MON-FRI = 1-5 or 8-12
// Teacher header in col 1 (left) or col 8 (right) on a row that has "HRS"
// TIME header follows 3 rows later
// Data rows follow TIME header row, end at "www.oxford"

interface Block { name: string; subject: string; timeCol: number; dataColStart: number; timeHeaderRow: number; homeroomGrade?: string; homeroomSection?: string; }
const blocks: Block[] = [];

// Parse homeroom grade from header cell like "12 GRADE" or "11A GRADE"
function parseHomeroomGrade(cell: string): { grade: string; section: string } | null {
  const m = cell.match(/^(\d+|[IVXK]+)\s*([A-C]?)\s*GRADE/i);
  if (!m) return null;
  const grade = ROMAN[m[1].toUpperCase()] ?? m[1];
  const section = m[2].toUpperCase() || "A";
  return { grade, section };
}

for (let r = 0; r < rows.length; r++) {
  const row = rows[r] ?? [];
  // Check left side (teacher info in col 1)
  const leftInfo = extractTeacherInfo(c(row, 1));
  if (leftInfo && !SKIP_BLOCKS.some(s => leftInfo.name.toUpperCase().startsWith(s))) {
    const hrGrade = parseHomeroomGrade(c(row, 0));
    // Find TIME header row within next 5 rows
    for (let tr = r + 1; tr <= r + 5 && tr < rows.length; tr++) {
      if (c(rows[tr], 0).toUpperCase() === "TIME") {
        blocks.push({ ...leftInfo, timeCol: 0, dataColStart: 1, timeHeaderRow: tr,
          homeroomGrade: hrGrade?.grade, homeroomSection: hrGrade?.section });
        break;
      }
    }
  }
  // Check right side (teacher info in col 8)
  const rightInfo = extractTeacherInfo(c(row, 8));
  if (rightInfo && !SKIP_BLOCKS.some(s => rightInfo.name.toUpperCase().startsWith(s))) {
    const hrGrade = parseHomeroomGrade(c(row, 7));
    for (let tr = r + 1; tr <= r + 5 && tr < rows.length; tr++) {
      if (c(rows[tr], 7).toUpperCase() === "TIME") {
        blocks.push({ ...rightInfo, timeCol: 7, dataColStart: 8, timeHeaderRow: tr,
          homeroomGrade: hrGrade?.grade, homeroomSection: hrGrade?.section });
        break;
      }
    }
  }
}

console.log(`\nFound ${blocks.length} teacher blocks:`);
blocks.forEach(b => console.log(`  timeHeaderRow=${b.timeHeaderRow} col=${b.timeCol}: "${b.name}" -> "${b.subject}"`));

const csvRows: string[] = ["teacher,subject,grade,section,room,day,start_time"];
let total = 0;

for (const block of blocks) {
  for (let r = block.timeHeaderRow + 1; r < block.timeHeaderRow + 20 && r < rows.length; r++) {
    const row = rows[r] ?? [];
    const timeStr = c(row, block.timeCol);
    if (timeStr.toLowerCase().includes("www")) break;
    const startTime = parseStartTime(timeStr);
    if (!startTime) continue;

    for (let d = 0; d < 5; d++) {
      const gradeRaw = c(row, block.dataColStart + d);
      const gradeUpper = gradeRaw.toUpperCase();
      const teacherSafe = block.name.includes(",") ? `"${block.name}"` : block.name;
      const hrGrade = block.homeroomGrade ?? "12";
      const hrSection = block.homeroomSection ?? "A";

      // HOMEROOM
      if (gradeUpper === "HOMEROOM" && block.homeroomGrade) {
        csvRows.push(`${teacherSafe},Homeroom,${hrGrade},${hrSection},,${DAY_NAMES[d]},${startTime}`);
        total++;
        continue;
      }
      // LUNCH with supervision = Lunch Duty; plain LUNCH = free time, skip
      if (gradeUpper.startsWith("LUNCH")) {
        if (block.homeroomGrade && (gradeUpper.includes("SUPERVISION") || gradeUpper.includes("DUTY"))) {
          // Map supervision location to subject name
          let lunchSubject = "Lunch Duty";
          if (gradeUpper.includes("GYM")) lunchSubject = "Lunch Duty - GYM";
          else if (gradeUpper.includes("CAFETERIA")) lunchSubject = "Lunch Duty - Cafeteria";
          else if (gradeUpper.includes("SYNTHETIC")) lunchSubject = "Lunch Duty - Synthetic Field";
          else if (gradeUpper.includes("SCHOOL BUS") || gradeUpper.includes("BUS")) lunchSubject = "Lunch Duty - School Bus Area";
          else if (gradeUpper.includes("PARKING")) lunchSubject = "Lunch Duty - Parking Lot";
          csvRows.push(`${teacherSafe},${lunchSubject},${hrGrade},${hrSection},,${DAY_NAMES[d]},${startTime}`);
          total++;
        }
        continue;
      }
      // STUDENT DISMISSAL DUTY (always Friday col d=4, or special rows)
      if (gradeUpper.includes("DISMISSAL") && block.homeroomGrade) {
        csvRows.push(`${teacherSafe},Dismissal Duty,${hrGrade},${hrSection},,${DAY_NAMES[d]},${startTime}`);
        total++;
        continue;
      }
      // RESOURCE ROOM SUPPORT — no specific grade
      if (gradeUpper.includes("RESOURCE ROOM")) {
        csvRows.push(`${teacherSafe},Resource Room Support,,,,${DAY_NAMES[d]},${startTime}`);
        total++;
        continue;
      }
      const parsed = parseGradeCell(gradeRaw);
      if (!parsed) continue;
      const { grade, section, isLab } = parsed;
      const subjectMapped = mapSubject(block.subject, grade);
      const room = isLab ? getLabRoom(block.subject) : "";
      csvRows.push(`${teacherSafe},${subjectMapped},${grade},${section},${room},${DAY_NAMES[d]},${startTime}`);
      total++;
    }
  }
}

const outputFile = path.join(process.cwd(), "schedules-import-v2.csv");
fs.writeFileSync(outputFile, csvRows.join("\n"), "utf-8");
console.log(`\n✅ Generated ${total} assignment rows -> schedules-import.csv`);
console.log("\nFirst 15 rows:");
csvRows.slice(0, 16).forEach(r => console.log(" ", r));
