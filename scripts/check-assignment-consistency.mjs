import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Get all assignments with grade and timeblock level
const asgns = await p.assignment.findMany({
  include: {
    grade: true,
    timeBlock: true,
    teacher: true,
    subject: true,
  },
  orderBy: [{ teacher: { name: "asc" } }, { timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];
const issues = [];

for (const a of asgns) {
  if (!a.grade) continue;
  const gLevel = a.grade.level; // LOW_SECONDARY or SECONDARY
  const tbLevel = a.timeBlock.level;
  const gradeNum = Number(a.grade.name);

  // Middle grades (6-8) should NOT be using SECONDARY-only timeblocks (11:45, 13:15, 14:15)
  const middleOnly = ["12:00", "13:00", "14:00"];
  const highOnly   = ["11:45", "13:15", "14:15"];
  const st = a.timeBlock.startTime;

  if (gLevel === "LOW_SECONDARY" && highOnly.includes(st)) {
    issues.push(`❌ MIDDLE grade ${a.grade.name}${a.grade.section??""} has HIGH-only slot ${st} — Teacher: ${a.teacher.name} | ${a.subject.name} | ${DAYS[a.timeBlock.dayOfWeek]}`);
  }
  if (gLevel === "SECONDARY" && middleOnly.includes(st)) {
    issues.push(`❌ HIGH grade ${a.grade.name}${a.grade.section??""} has MIDDLE-only slot ${st} — Teacher: ${a.teacher.name} | ${a.subject.name} | ${DAYS[a.timeBlock.dayOfWeek]}`);
  }
}

if (issues.length === 0) {
  console.log("✅ All assignments use correct timeblocks for their grade level.");
} else {
  console.log(`Found ${issues.length} mismatches:\n`);
  issues.forEach(i => console.log(i));
}

await p.$disconnect();
