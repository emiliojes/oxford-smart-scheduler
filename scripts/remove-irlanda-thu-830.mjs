import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🗑️  REMOVIENDO JUEVES 8:30 - 11B MATH - IRLANDA\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Irlanda" } } 
});

// Buscar la asignación
const assignment = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '08:30' },
    grade: { name: '11', section: 'B' }
  },
  include: {
    grade: true,
    subject: true,
    timeBlock: true
  }
});

if (assignment) {
  console.log('Encontrado:');
  console.log(`  ${assignment.timeBlock.startTime}-${assignment.timeBlock.endTime}`);
  console.log(`  ${assignment.grade.name}${assignment.grade.section} ${assignment.subject.name}`);
  console.log(`  ID: ${assignment.id}\n`);
  
  await p.assignment.delete({
    where: { id: assignment.id }
  });
  
  console.log('✅ Eliminado\n');
} else {
  console.log('⚠️  No se encontró la asignación\n');
}

// Mostrar horario jueves actualizado
console.log('📅 HORARIO JUEVES ACTUALIZADO:\n');

const juevesAssignments = await p.assignment.findMany({
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

juevesAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` (${a.note})` : "";
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note}`);
});

await p.$disconnect();
