import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🗑️  ELIMINANDO TODAS LAS CLASES DE 7B - KENNARD CALLENDER\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Kennard" } }
});

if (!teacher) {
  console.log('❌ Teacher Kennard no encontrado');
  await p.$disconnect();
  process.exit(1);
}

const grade7B = await p.grade.findFirst({
  where: { name: '7', section: 'B' }
});

if (!grade7B) {
  console.log('❌ Grade 7B no encontrado');
  await p.$disconnect();
  process.exit(1);
}

// Buscar todas las asignaciones de Kennard con 7B
const assignments7B = await p.assignment.findMany({
  where: {
    teacherId: teacher.id,
    gradeId: grade7B.id
  },
  include: {
    subject: true,
    timeBlock: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

console.log(`📚 Encontradas ${assignments7B.length} clases de 7B para eliminar:\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

assignments7B.forEach((a, index) => {
  console.log(`${index + 1}. ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime} - 7B ${a.subject.name}`);
});

console.log('\n🗑️  Eliminando...\n');

// Eliminar todas las asignaciones
const result = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    gradeId: grade7B.id
  }
});

console.log(`✅ ${result.count} clases de 7B eliminadas exitosamente\n`);

// Mostrar horario actualizado
console.log('📅 HORARIO ACTUALIZADO DE KENNARD CALLENDER:\n');

const updatedAssignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: {
    subject: true,
    grade: true,
    timeBlock: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

let currentDay = 0;
updatedAssignments.forEach(a => {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = `${a.grade.name}${a.grade.section || ''}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

console.log(`\n📊 Total de clases restantes: ${updatedAssignments.length}\n`);

await p.$disconnect();
