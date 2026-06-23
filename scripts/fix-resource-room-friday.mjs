import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO RESOURCE ROOM SUPPORT DEL VIERNES\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Aracellys" } }
});

const resourceRoom = await p.subject.findFirst({
  where: { name: "Resource Room Support" }
});

// Buscar la asignación del viernes
const assignment = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    subjectId: resourceRoom.id,
    timeBlock: {
      dayOfWeek: 5 // Viernes
    }
  },
  include: {
    timeBlock: true,
    grade: true
  }
});

if (!assignment) {
  console.log('❌ No se encontró la asignación del viernes');
  await p.$disconnect();
  process.exit(1);
}

console.log(`Encontrado: Viernes ${assignment.timeBlock.startTime}-${assignment.timeBlock.endTime}`);
console.log(`Grade actual: ${assignment.grade ? assignment.grade.name + assignment.grade.section : 'N/A'}`);
console.log(`Status actual: ${assignment.status}\n`);

// Actualizar: quitar el grade y cambiar status a CONFIRMED
const updated = await p.assignment.update({
  where: { id: assignment.id },
  data: {
    gradeId: null,
    status: 'CONFIRMED',
    conflicts: {
      deleteMany: {}
    }
  },
  include: {
    timeBlock: true,
    subject: true,
    conflicts: true
  }
});

console.log('✅ Actualizado:');
console.log(`   Grade: N/A`);
console.log(`   Status: ${updated.status}`);
console.log(`   Conflicts: ${updated.conflicts.length}\n`);

await p.$disconnect();
