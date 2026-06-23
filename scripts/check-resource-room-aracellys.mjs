import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO RESOURCE ROOM SUPPORT DE ARACELLYS\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Aracellys" } }
});

const resourceRoom = await p.subject.findFirst({
  where: { name: "Resource Room Support" }
});

const assignments = await p.assignment.findMany({
  where: {
    teacherId: teacher.id,
    subjectId: resourceRoom.id
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
    conflicts: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

console.log(`Total Resource Room Support: ${assignments.length}\n`);

assignments.forEach(a => {
  const day = days[a.timeBlock.dayOfWeek];
  const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
  const hasConflicts = a.conflicts.length > 0;
  const status = a.status;
  
  console.log(`${day} ${a.timeBlock.startTime}-${a.timeBlock.endTime}`);
  console.log(`  Grade: ${gradeName}`);
  console.log(`  Status: ${status}`);
  console.log(`  Conflicts: ${hasConflicts ? a.conflicts.length : 'None'}`);
  if (hasConflicts) {
    a.conflicts.forEach(c => {
      console.log(`    - ${c.conflictType}: ${c.description}`);
    });
  }
  console.log('');
});

await p.$disconnect();
