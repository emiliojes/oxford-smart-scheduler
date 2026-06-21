import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 REMOVIENDO HOMEROOM INCORRECTO - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

// Eliminar HOMEROOM (no le corresponde a este teacher)
console.log('1. Eliminando HOMEROOM 07:30-08:30 10A (es de Vanessa Muñoz)...');
const deleted = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    subject: { name: "Homeroom" }
  }
});
console.log(`   ✅ Eliminado ${deleted.count} assignment(s)\n`);

// Eliminar duplicado de 7B a las 09:45 (debe estar solo a las 08:30)
console.log('2. Verificando duplicados de 7B...');
const grade7B = await p.grade.findFirst({ where: { name: '7', section: 'B' } });

const assignments7B = await p.assignment.findMany({
  where: {
    teacherId: teacher.id,
    gradeId: grade7B.id,
    timeBlock: { dayOfWeek: 1 }
  },
  include: { timeBlock: true }
});

console.log(`   Encontrados ${assignments7B.length} assignments con 7B:`);
assignments7B.forEach(a => {
  console.log(`   - ${a.timeBlock.startTime}-${a.timeBlock.endTime}`);
});

// Si hay duplicado a las 09:45, eliminarlo
const duplicate0945 = assignments7B.find(a => a.timeBlock.startTime === '09:45');
if (duplicate0945) {
  await p.assignment.delete({ where: { id: duplicate0945.id } });
  console.log('   ✅ Eliminado duplicado 7B a las 09:45\n');
} else {
  console.log('   ✓ No hay duplicados\n');
}

// Mostrar horario final del lunes
console.log('📅 HORARIO LUNES FINAL:\n');

const mondayAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 1 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

mondayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

console.log('\n📋 ESPERADO:');
console.log('  08:30-09:30 - 7B Math');
console.log('  09:45-10:45 - 8B Math');
console.log('  10:45-11:45 - 10B Math');
console.log('  11:45-12:45 - 8A Math');
console.log('  13:15-14:15 - 10A Math');

await p.$disconnect();
