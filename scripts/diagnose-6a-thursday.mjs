import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Find grade 6A
const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });
console.log("Grade 6A:", grade);

// 2. Find teacher Aracellys
const teacher = await p.teacher.findFirst({ where: { name: { contains: "racellys", mode: "insensitive" } } });
console.log("\nTeacher Aracellys:", teacher);

// 3. Thursday (day 4) time blocks at 14:00
const blocks = await p.timeBlock.findMany({
  where: { dayOfWeek: 4, startTime: "14:00" },
  orderBy: { level: "asc" }
});
console.log("\nThursday 14:00 time blocks:");
blocks.forEach(b => console.log(`  [${b.id}] level:${b.level} type:${b.blockType} ${b.startTime}-${b.endTime}`));

// 4. Current assignments for 6A on Thursday
const assignments = await p.assignment.findMany({
  where: { gradeId: grade?.id, timeBlock: { dayOfWeek: 4 } },
  include: { subject: true, teacher: true, timeBlock: true },
  orderBy: { timeBlock: { startTime: "asc" } }
});
console.log("\n6A Thursday assignments:");
assignments.forEach(a => console.log(`  ${a.timeBlock.startTime} | ${a.subject.name} | ${a.teacher.name} | block level: ${a.timeBlock.level}`));

// 5. Is there already an assignment at 14:00 Thursday for 6A?
const existing = assignments.filter(a => a.timeBlock.startTime === "14:00");
console.log("\n6A at 14:00 Thursday:", existing.length === 0 ? "EMPTY (slot available)" : `OCCUPIED: ${existing.map(a => a.subject.name).join(", ")}`);

// 6. Check Spanish subjects
const spanish = await p.subject.findMany({ where: { name: "Spanish" } });
console.log("\nSpanish subjects:", spanish.map(s => `[${s.id}] level:${s.level}`));

await p.$disconnect();
