import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find all assignments with Spanish subject
const spanishSubjects = await p.subject.findMany({ where: { name: "Spanish" } });
console.log("Spanish subjects:", spanishSubjects.map(s => `[${s.id}] level:${s.level}`));

const spanishAssignments = await p.assignment.findMany({
  where: { subject: { name: "Spanish" } },
  include: { teacher: true, grade: true, timeBlock: true },
  orderBy: [{ grade: { name: "asc" } }, { grade: { section: "asc" } }]
});

console.log("\nAll Spanish assignments:");
spanishAssignments.forEach(a =>
  console.log(`  ${a.grade?.name}${a.grade?.section||''} | day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | Teacher: ${a.teacher.name} (level:${a.teacher.level})`)
);

// All teachers and their levels
console.log("\nAll teachers with level:");
const teachers = await p.teacher.findMany({ orderBy: { level: "asc" } });
teachers.forEach(t => console.log(`  [${t.level}] ${t.name}`));

await p.$disconnect();
