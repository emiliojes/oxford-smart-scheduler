import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Omely" } } });
const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true, subject: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

const DAYS = ["","MON","TUE","WED","THU","FRI"];

// Find duplicates: same grade + same timeblock
const seen = new Map();
let removed = 0;
for (const a of asgns) {
  if (!a.grade) continue;
  const key = `${a.gradeId}-${a.timeBlockId}`;
  if (seen.has(key)) {
    await p.assignment.delete({ where: { id: a.id } });
    console.log(`🗑️  Removed dup: ${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} Grade ${a.grade.name}${a.grade.section??""}`);
    removed++;
  } else {
    seen.set(key, a.id);
  }
}

if (removed === 0) console.log("✅ No duplicates found");

// Print final schedule
const final = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true, subject: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
console.log(`\n${teacher.name} — ${final.length} assignments:`);
for (const a of final) {
  console.log(`  ${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime} [${a.grade?.level??"-"}] Grade ${a.grade?.name??"-"}${a.grade?.section??""} ${a.subject.name}${a.note?" ("+a.note+")":""}`);
}

await p.$disconnect();
