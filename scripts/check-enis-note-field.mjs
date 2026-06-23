import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO CAMPO NOTE DE ENIS - MIÉRCOLES 8:30\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Enis" } }
});

const assignment = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 3, startTime: '08:30' },
    grade: { name: '7', section: 'B' }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
    conflicts: true
  }
});

if (!assignment) {
  console.log('❌ Asignación no encontrada');
  await p.$disconnect();
  process.exit(1);
}

console.log('📋 ASIGNACIÓN COMPLETA:\n');
console.log(`ID: ${assignment.id}`);
console.log(`Teacher ID: ${assignment.teacherId}`);
console.log(`Subject: ${assignment.subject.name}`);
console.log(`Grade: ${assignment.grade.name}${assignment.grade.section}`);
console.log(`Time: ${assignment.timeBlock.startTime}-${assignment.timeBlock.endTime}`);
console.log(`Status: ${assignment.status}`);
console.log(`Note: "${assignment.note}"`);
console.log(`Conflicts: ${assignment.conflicts.length}`);

if (assignment.note && assignment.note.includes('conflict')) {
  console.log('\n⚠️  EL CAMPO NOTE CONTIENE "conflict"!');
  console.log(`   Esto explica por qué aparece en la UI`);
  console.log(`   Necesitamos limpiar este campo\n`);
  
  // Limpiar el note
  await p.assignment.update({
    where: { id: assignment.id },
    data: { note: null }
  });
  
  console.log('✅ Campo note limpiado');
}

console.log('');

await p.$disconnect();
