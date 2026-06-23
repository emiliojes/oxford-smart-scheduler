import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO NOTAS DE ARACELLYS\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Aracellys" } }
});

const assignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: {
    subject: true,
    grade: true,
    timeBlock: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

let currentDay = 0;
assignments.forEach(a => {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
  const noteText = a.note ? ` (${a.note})` : '';
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${noteText}`);
});

console.log('\n');

await p.$disconnect();
