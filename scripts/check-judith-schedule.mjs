import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

if (!teacher) {
  console.log("Teacher Judith not found");
  process.exit(1);
}

console.log(`📅 HORARIO COMPLETO: ${teacher.name}\n`);

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

const days = ["", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
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

console.log('\n');

await p.$disconnect();
