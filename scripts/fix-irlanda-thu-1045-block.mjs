import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO BLOQUE DE IRLANDA JUEVES 10:45 - 11A T.S\n');

const assignment = await p.assignment.findFirst({
  where: {
    teacher: { name: { contains: "Irlanda" } },
    timeBlock: { dayOfWeek: 4, startTime: '10:45' },
    grade: { name: '11', section: 'A' }
  }
});

const correctBlock = await p.timeBlock.findFirst({
  where: {
    dayOfWeek: 4,
    startTime: '10:45',
    endTime: '11:45',
    blockType: 'CLASS',
    level: { in: ['SECONDARY', 'BOTH'] }
  }
});

if (!assignment || !correctBlock) {
  console.log('❌ No se encontró la asignación o el bloque correcto');
  process.exit(1);
}

console.log(`Cambiando de bloque 10:45-11:30 (45 min) a 10:45-11:45 (60 min)...\n`);

// Actualizar la asignación con el bloque correcto
const updated = await p.assignment.update({
  where: { id: assignment.id },
  data: {
    timeBlockId: correctBlock.id,
    status: 'CONFIRMED',
    conflicts: {
      deleteMany: {} // Limpiar conflictos
    }
  },
  include: {
    teacher: true,
    subject: true,
    grade: true,
    timeBlock: true
  }
});

console.log('✅ CORREGIDO:');
console.log(`   Teacher: ${updated.teacher.name}`);
console.log(`   Grade: ${updated.grade.name}${updated.grade.section}`);
console.log(`   Subject: ${updated.subject.name}`);
console.log(`   Nuevo bloque: ${updated.timeBlock.startTime} - ${updated.timeBlock.endTime}`);
console.log(`   Duración: ${updated.timeBlock.duration} min`);
console.log(`   Status: ${updated.status}\n`);

await p.$disconnect();
