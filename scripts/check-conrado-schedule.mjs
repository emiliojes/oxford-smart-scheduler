import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('📅 VERIFICANDO HORARIO DE CONRADO DE LEÓN\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Conrado" } }
});

if (!teacher) {
  console.log('❌ Teacher Conrado no encontrado');
  await p.$disconnect();
  process.exit(1);
}

console.log(`Teacher: ${teacher.name}`);
console.log(`ID: ${teacher.id}\n`);

const assignments = await p.assignment.findMany({
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

console.log(`Total de asignaciones: ${assignments.length}\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

let currentDay = 0;
assignments.forEach(a => {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

// Verificar si hay alguna clase de 7B
const classes7B = assignments.filter(a => a.grade && a.grade.name === '7' && a.grade.section === 'B');
console.log(`\n\n🔍 Clases de 7B encontradas: ${classes7B.length}`);

if (classes7B.length > 0) {
  console.log('\n⚠️  Clases de 7B que aún existen:');
  classes7B.forEach(a => {
    console.log(`  - ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} - 7B ${a.subject.name}`);
  });
} else {
  console.log('✅ No hay clases de 7B en el horario');
}

console.log('');

await p.$disconnect();
