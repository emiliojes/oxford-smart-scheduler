import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check grade 6A assignments to see what times they use
const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });
console.log("Grade 6A:", grade?.id, grade?.level);

const asgns = await p.assignment.findMany({
  where: { gradeId: grade?.id, timeBlock: { dayOfWeek: 1 } },
  include: { timeBlock: true, subject: true, teacher: true },
  orderBy: { timeBlock: { startTime: "asc" } },
});

console.log("\nGrade 6A Monday assignments:");
for (const a of asgns) {
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime}  ${a.subject.name}  (block level: ${a.timeBlock.level})`);
}

// Check what timeblock level the morning slots use for a middle grade
const allDay1 = await p.assignment.findMany({
  where: { gradeId: grade?.id },
  include: { timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

const times = [...new Set(allDay1.map(a => `${a.timeBlock.startTime} level:${a.timeBlock.level}`))].sort();
console.log("\nAll unique start times for 6A:", times);

await p.$disconnect();
