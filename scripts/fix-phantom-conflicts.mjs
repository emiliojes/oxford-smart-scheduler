import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 BUSCANDO Y CORRIGIENDO CONFLICTOS FANTASMA\n');

// Buscar todas las asignaciones con status CONFLICT
const conflictAssignments = await p.assignment.findMany({
  where: { status: 'CONFLICT' },
  include: {
    teacher: true,
    subject: true,
    grade: true,
    timeBlock: true,
    conflicts: true
  }
});

console.log(`Encontradas ${conflictAssignments.length} asignaciones con status CONFLICT\n`);

let fixed = 0;

for (const assignment of conflictAssignments) {
  const gradeName = assignment.grade ? `${assignment.grade.name}${assignment.grade.section || ''}` : 'N/A';
  
  console.log(`Verificando: ${assignment.teacher.name} - ${gradeName} ${assignment.subject.name}`);
  console.log(`  Día: ${assignment.timeBlock.dayOfWeek}, Hora: ${assignment.timeBlock.startTime}`);
  console.log(`  Conflictos registrados: ${assignment.conflicts.length}`);
  
  // Si no tiene conflictos reales, cambiar status a CONFIRMED
  if (assignment.conflicts.length === 0) {
    await p.assignment.update({
      where: { id: assignment.id },
      data: { status: 'CONFIRMED' }
    });
    console.log(`  ✅ Corregido: status cambiado a CONFIRMED\n`);
    fixed++;
  } else {
    console.log(`  ⚠️ Tiene conflictos reales:`);
    assignment.conflicts.forEach(c => {
      console.log(`     - ${c.description} (${c.severity})`);
    });
    console.log('');
  }
}

console.log('='.repeat(60));
console.log(`\n📊 RESUMEN:`);
console.log(`   Total revisados: ${conflictAssignments.length}`);
console.log(`   Conflictos fantasma corregidos: ${fixed}`);
console.log(`   Conflictos reales: ${conflictAssignments.length - fixed}\n`);

await p.$disconnect();
