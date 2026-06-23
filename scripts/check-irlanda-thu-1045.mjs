import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO IRLANDA JUEVES 10:45 - 11A T.S\n');

const assignment = await p.assignment.findFirst({
  where: {
    teacher: { name: { contains: "Irlanda" } },
    timeBlock: { dayOfWeek: 4, startTime: '10:45' },
    grade: { name: '11', section: 'A' }
  },
  include: {
    teacher: true,
    subject: true,
    grade: true,
    timeBlock: true,
    conflicts: true
  }
});

if (!assignment) {
  console.log('❌ No se encontró la asignación');
  process.exit(1);
}

console.log('📋 ASIGNACIÓN:');
console.log(`   Teacher: ${assignment.teacher.name}`);
console.log(`   Grade: ${assignment.grade.name}${assignment.grade.section}`);
console.log(`   Subject: ${assignment.subject.name}`);
console.log(`   Day: Jueves (${assignment.timeBlock.dayOfWeek})`);
console.log(`   Time: ${assignment.timeBlock.startTime} - ${assignment.timeBlock.endTime}`);
console.log(`   Duration: ${assignment.timeBlock.duration} minutes`);
console.log(`   Block Type: ${assignment.timeBlock.blockType}`);
console.log(`   Block Level: ${assignment.timeBlock.level}`);
console.log(`   Status: ${assignment.status}\n`);

console.log('⚠️  CONFLICTOS:');
assignment.conflicts.forEach((c, i) => {
  console.log(`   ${i + 1}. ${c.conflictType}`);
  console.log(`      Descripción: ${c.description}`);
  console.log(`      Severidad: ${c.severity}\n`);
});

// Verificar si el problema es la duración
const expectedDuration = 60; // 1 hora para clases normales
const actualDuration = parseFloat(assignment.timeBlock.duration);

console.log('🔍 ANÁLISIS:');
if (actualDuration < expectedDuration) {
  console.log(`   ⚠️ El bloque tiene duración corta: ${actualDuration} min (esperado: ${expectedDuration} min)`);
  console.log(`   Esto puede causar el error "secondaryDuration"`);
}

// Buscar el bloque correcto de 10:45-11:45
const correctBlock = await p.timeBlock.findFirst({
  where: {
    dayOfWeek: 4,
    startTime: '10:45',
    endTime: '11:45',
    blockType: 'CLASS'
  }
});

if (correctBlock) {
  console.log(`\n✅ Bloque correcto encontrado:`);
  console.log(`   ID: ${correctBlock.id}`);
  console.log(`   Tiempo: ${correctBlock.startTime} - ${correctBlock.endTime}`);
  console.log(`   Duración: ${correctBlock.duration} min`);
  console.log(`   Level: ${correctBlock.level}`);
  
  if (correctBlock.id !== assignment.timeBlockId) {
    console.log(`\n💡 SOLUCIÓN: Cambiar al bloque correcto`);
    console.log(`   Bloque actual: ${assignment.timeBlockId}`);
    console.log(`   Bloque correcto: ${correctBlock.id}`);
  }
}

await p.$disconnect();
