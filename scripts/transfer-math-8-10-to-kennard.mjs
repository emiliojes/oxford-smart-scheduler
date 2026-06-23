import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔄 TRANSFIRIENDO ASIGNACIONES DE "TBD - MATH 8-10" A KENNARD CALLENDER\n');

// Buscar ambos teachers
const tbdTeacher = await p.teacher.findFirst({
  where: { name: { contains: "TBD - Math 8-10" } }
});

const kennardTeacher = await p.teacher.findFirst({
  where: { name: { contains: "Kennard" } }
});

if (!tbdTeacher || !kennardTeacher) {
  console.log('❌ No se encontraron los teachers');
  await p.$disconnect();
  process.exit(1);
}

console.log(`De: ${tbdTeacher.name} (${tbdTeacher.id})`);
console.log(`A:  ${kennardTeacher.name} (${kennardTeacher.id})\n`);

// Obtener todas las asignaciones del TBD teacher
const assignments = await p.assignment.findMany({
  where: { teacherId: tbdTeacher.id },
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

console.log(`📚 Encontradas ${assignments.length} asignaciones para transferir:\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

assignments.forEach((a, index) => {
  const gradeName = `${a.grade.name}${a.grade.section || ''}`;
  console.log(`${index + 1}. ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

console.log('\n🔄 Transfiriendo...\n');

// Transferir todas las asignaciones
const result = await p.assignment.updateMany({
  where: { teacherId: tbdTeacher.id },
  data: { teacherId: kennardTeacher.id }
});

console.log(`✅ ${result.count} asignaciones transferidas exitosamente\n`);

// Verificar el horario de Kennard
console.log('📅 HORARIO COMPLETO DE KENNARD CALLENDER:\n');

const kennardAssignments = await p.assignment.findMany({
  where: { teacherId: kennardTeacher.id },
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
kennardAssignments.forEach(a => {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = `${a.grade.name}${a.grade.section || ''}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

console.log('\n');

await p.$disconnect();
