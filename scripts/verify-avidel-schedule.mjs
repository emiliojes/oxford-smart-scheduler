import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Avidel" } } });
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

console.log(`\n📅 HORARIO COMPLETO: ${teacher.name} (SPANISH 2A,2B,2C,3A,3B)\n`);

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

// Calculate total hours
const totalMins = assignments.reduce((sum, a) => {
  const start = a.timeBlock.startTime.split(':').map(Number);
  const end = a.timeBlock.endTime.split(':').map(Number);
  const mins = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
  return sum + mins;
}, 0);

const hours = Math.floor(totalMins / 60);
const mins = totalMins % 60;

console.log(`\n✅ Total assignments: ${assignments.length}`);
console.log(`📊 Total hours: ${hours}h ${mins}min`);
await p.$disconnect();
