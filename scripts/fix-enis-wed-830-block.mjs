import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO BLOQUE DE ENIS - MIÉRCOLES 8:30\n');

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
    timeBlock: true
  }
});

console.log('Bloque actual:');
console.log(`  ${assignment.timeBlock.startTime} - ${assignment.timeBlock.endTime}`);
console.log(`  Duration: ${assignment.timeBlock.duration} min\n`);

// Buscar el bloque correcto de 08:30-09:30
const correctBlock = await p.timeBlock.findFirst({
  where: {
    dayOfWeek: 3,
    startTime: '08:30',
    endTime: '09:30',
    blockType: 'CLASS'
  }
});

if (!correctBlock) {
  console.log('❌ No se encontró bloque correcto 08:30-09:30');
  await p.$disconnect();
  process.exit(1);
}

console.log('Bloque correcto encontrado:');
console.log(`  ${correctBlock.startTime} - ${correctBlock.endTime}`);
console.log(`  Duration: ${correctBlock.duration} min`);
console.log(`  Level: ${correctBlock.level}\n`);

if (assignment.timeBlockId === correctBlock.id) {
  console.log('✓ Ya está usando el bloque correcto');
} else {
  console.log('Actualizando al bloque correcto...\n');
  
  await p.assignment.update({
    where: { id: assignment.id },
    data: { timeBlockId: correctBlock.id }
  });
  
  console.log('✅ Bloque actualizado correctamente');
}

await p.$disconnect();
