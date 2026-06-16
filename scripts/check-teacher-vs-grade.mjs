import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

// For each teacher, group their assignments by day+time
// Then check if the grade has that same assignment (same id)
const teachers = await p.teacher.findMany({
  where: { level: { in: ["SECONDARY", "LOW_SECONDARY", "BOTH"] } },
  orderBy: { name: "asc" },
});

const issues = [];

for (const teacher of teachers) {
  const asgns = await p.assignment.findMany({
    where: { teacherId: teacher.id },
    include: { grade: true, timeBlock: true, subject: true },
  });

  // Check for teacher conflicts: same day+time, two different grades
  const slotMap = {};
  for (const a of asgns) {
    if (!a.grade) continue;
    const key = `${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(`${a.grade.name}${a.grade.section ?? ""} ${a.subject.name}`);
  }

  for (const [slot, entries] of Object.entries(slotMap)) {
    if (entries.length > 1) {
      issues.push(`⚠️  ${teacher.name} — CONFLICT at ${slot}: ${entries.join(" | ")}`);
    }
  }
}

if (issues.length === 0) {
  console.log("✅ No teacher conflicts found — all teacher slots match grade schedules correctly.");
} else {
  console.log(`Found ${issues.length} conflicts:\n`);
  issues.forEach(i => console.log(i));
}

// Also verify: for each secondary grade, count assignments per day
// and check if any day has duplicate slots
const grades = await p.grade.findMany({
  where: { level: { in: ["SECONDARY", "LOW_SECONDARY"] } },
  orderBy: [{ name: "asc" }, { section: "asc" }],
});

const gradeIssues = [];
for (const grade of grades) {
  const asgns = await p.assignment.findMany({
    where: { gradeId: grade.id },
    include: { timeBlock: true, subject: true, teacher: true },
  });
  const slotMap = {};
  for (const a of asgns) {
    const key = `${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(`${a.subject.name} (${a.teacher.name})`);
  }
  for (const [slot, entries] of Object.entries(slotMap)) {
    if (entries.length > 1) {
      gradeIssues.push(`⚠️  Grade ${grade.name}${grade.section ?? ""} — DOUBLE at ${slot}: ${entries.join(" | ")}`);
    }
  }
}

if (gradeIssues.length === 0) {
  console.log("✅ No grade duplicate slots found.");
} else {
  console.log(`\nGrade duplicates (${gradeIssues.length}):\n`);
  gradeIssues.forEach(i => console.log(i));
}

await p.$disconnect();
