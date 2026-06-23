import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🗑️  ELIMINANDO BLOQUES DUPLICADOS DE LOW_SECONDARY\n');

// Primero, verificar si hay asignaciones en estos bloques
const blocksToDelete = await p.timeBlock.findMany({
  where: {
    level: "LOW_SECONDARY",
    OR: [
      { startTime: "13:15", endTime: "14:15" },
      { startTime: "14:15", endTime: "15:15" }
    ]
  },
  include: {
    assignments: true
  }
});

console.log(`📋 Bloques a eliminar: ${blocksToDelete.length}\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

for (const block of blocksToDelete) {
  console.log(`${days[block.dayOfWeek]} ${block.startTime}-${block.endTime}:`);
  console.log(`  Asignaciones: ${block.assignments.length}`);
  
  if (block.assignments.length > 0) {
    console.log(`  ⚠️  TIENE ASIGNACIONES - necesitamos moverlas primero`);
    for (const assignment of block.assignments) {
      console.log(`    - Assignment ID: ${assignment.id}`);
    }
  }
}

console.log('\n');

// Contar asignaciones totales
const totalAssignments = blocksToDelete.reduce((sum, b) => sum + b.assignments.length, 0);

if (totalAssignments > 0) {
  console.log(`❌ NO SE PUEDE ELIMINAR - Hay ${totalAssignments} asignaciones en estos bloques`);
  console.log('   Primero necesitamos mover las asignaciones a los bloques correctos.\n');
} else {
  console.log('✅ No hay asignaciones - seguro para eliminar\n');
  console.log('Eliminando bloques...\n');
  
  const result = await p.timeBlock.deleteMany({
    where: {
      level: "LOW_SECONDARY",
      OR: [
        { startTime: "13:15", endTime: "14:15" },
        { startTime: "14:15", endTime: "15:15" }
      ]
    }
  });
  
  console.log(`✅ ${result.count} bloques eliminados\n`);
}

await p.$disconnect();
