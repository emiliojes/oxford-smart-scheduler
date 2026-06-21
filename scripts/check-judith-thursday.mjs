import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO JUEVES - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
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
console.log('  08:30-09:30 - 10A');
console.log('  09:45-10:45 - 9A');
console.log('  11:45-12:45 - 12A (o 12)');
console.log('  12:45-13:15 - LUNCH/SUPERVISION');
console.log('  13:15-14:15 - 9B');
console.log('  14:15-15:15 - 11A (última hora)');

// Verificar última hora
const lastClass = thursdayAssignments[thursdayAssignments.length - 1];
if (lastClass) {
  const gradeName = `${lastClass.grade.name}${lastClass.grade.section || ""}`;
  console.log(`\n🔍 Última hora actual: ${lastClass.timeBlock.startTime} - ${gradeName}`);
  console.log('   Debe ser: 14:15-15:15 - 11A');
}

await p.$disconnect();
