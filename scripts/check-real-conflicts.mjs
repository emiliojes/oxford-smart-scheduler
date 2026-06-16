import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

function secGroup(gradeName) {
  const n = Number(gradeName);
  if ([6,7,8].includes(n)) return "MIDDLE";
  if ([9,10,11,12].includes(n)) return "HIGH";
  return "OTHER";
}

const teachers = await p.teacher.findMany({
  where: { level: { in: ["SECONDARY", "LOW_SECONDARY", "BOTH"] } },
  orderBy: { name: "asc" },
});

const realConflicts = [];

for (const teacher of teachers) {
  const asgns = await p.assignment.findMany({
    where: { teacherId: teacher.id },
    include: { grade: true, timeBlock: true, subject: true },
  });

  // Group by day + startTime + secGroup (MIDDLE or HIGH)
  // A real conflict = same day+time+schoolGroup but two different grades
  const slotMap = {};
  for (const a of asgns) {
    if (!a.grade) continue;
    const sg = secGroup(a.grade.name);
    const key = `${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} [${sg}]`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(`${a.grade.name}${a.grade.section ?? ""} ${a.subject.name}`);
  }

  for (const [slot, entries] of Object.entries(slotMap)) {
    if (entries.length > 1) {
      realConflicts.push(`⚠️  ${teacher.name} — ${slot}: ${entries.join(" | ")}`);
    }
  }
}

if (realConflicts.length === 0) {
  console.log("✅ No real teacher conflicts — all teachers are free at the right times per school level.");
} else {
  console.log(`Found ${realConflicts.length} REAL conflicts (same level, same slot):\n`);
  realConflicts.forEach(i => console.log(i));
}

await p.$disconnect();
