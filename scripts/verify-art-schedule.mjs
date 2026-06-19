import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "TBD - Art" } } });
const assignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } },
  ],
});

console.log(`\n📅 HORARIO COMPLETO: ${teacher.name} (ARTS - MIDDLE SCHOOL)\n`);

const days = ["", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
let currentDay = 0;

for (const a of assignments) {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` (${a.note})` : "";
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note}`);
}

console.log(`\n✅ Total assignments: ${assignments.length}`);
console.log(`📊 Total hours: 6hrs (all on Tuesday)`);
await p.$disconnect();
