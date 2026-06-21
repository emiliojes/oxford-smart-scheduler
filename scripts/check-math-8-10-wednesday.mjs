import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO MIÉRCOLES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

const wednesdayAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 3 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

console.log('📅 HORARIO MIÉRCOLES ACTUAL:\n');

wednesdayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name} [${a.id.substring(0, 8)}]`);
});

console.log('\n📋 ESPERADO SEGÚN IMAGEN:');
console.log('  07:30-08:30 - 8A');
console.log('  08:30-09:30 - 7B');
console.log('  09:45-10:45 - 10A');
console.log('  10:45-11:45 - 10B');
console.log('  13:15-14:15 - 8B');

// Verificar si hay duplicados a las 07:30
console.log('\n🔍 VERIFICANDO 07:30:\n');
const at0730 = wednesdayAssignments.filter(a => a.timeBlock.startTime === '07:30');
console.log(`Encontrados ${at0730.length} assignments a las 07:30:`);
at0730.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  - ${gradeName} ${a.subject.name} [${a.id.substring(0, 8)}]`);
});

if (at0730.length > 1) {
  console.log('\n⚠️ HAY DUPLICADOS - Solo debe haber 8A a las 07:30');
}

await p.$disconnect();
