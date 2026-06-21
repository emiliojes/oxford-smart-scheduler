import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO JUEVES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

const thursdayAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

console.log('📅 HORARIO JUEVES ACTUAL:\n');

thursdayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name} [${a.id.substring(0, 8)}]`);
});

console.log('\n📋 ESPERADO SEGÚN IMAGEN:');
console.log('  07:30-08:30 - 10B');
console.log('  08:30-09:30 - 8A');
console.log('  09:45-10:45 - 8B');
console.log('  10:45-11:45 - 10A');
console.log('  12:45-13:15 - LUNCH');
console.log('  13:15-14:15 - 7B (después del lunch)');

// Buscar 7B
const assignment7B = thursdayAssignments.find(a => 
  a.grade.name === '7' && a.grade.section === 'B'
);

if (assignment7B) {
  console.log(`\n🔍 7B está actualmente a las: ${assignment7B.timeBlock.startTime}-${assignment7B.timeBlock.endTime}`);
  console.log('   Debe estar a las: 13:15-14:15 (después del lunch)');
}

await p.$disconnect();
