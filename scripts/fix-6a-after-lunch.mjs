import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO BLOQUES DE TIEMPO DESPUÉS DEL LUNCH\n');

// Ver todos los bloques de LOW_SECONDARY
const blocks = await p.timeBlock.findMany({
  where: { 
    level: "LOW_SECONDARY",
    dayOfWeek: { in: [1, 2, 3, 4, 5] }
  },
  orderBy: [
    { dayOfWeek: 'asc' },
    { startTime: 'asc' }
  ]
});

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

console.log('📋 TODOS LOS BLOQUES DE LOW_SECONDARY:\n');

const byDay = {};
blocks.forEach(b => {
  const day = days[b.dayOfWeek];
  if (!byDay[day]) byDay[day] = [];
  byDay[day].push(b);
});

Object.keys(byDay).forEach(day => {
  console.log(`${day}:`);
  byDay[day].forEach(b => {
    console.log(`  ${b.startTime}-${b.endTime} | ${b.blockType.padEnd(15)} | ID: ${b.id}`);
  });
  console.log('');
});

// Buscar Grade 6A
const grade = await p.grade.findFirst({
  where: { name: "6", section: "A" }
});

// Ver asignaciones actuales
const assignments = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: {
    timeBlock: true,
    subject: true,
    teacher: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

console.log('\n📚 ASIGNACIONES ACTUALES DE 6A:\n');

const assignByDay = {};
assignments.forEach(a => {
  const day = days[a.timeBlock.dayOfWeek];
  if (!assignByDay[day]) assignByDay[day] = [];
  assignByDay[day].push(a);
});

Object.keys(assignByDay).forEach(day => {
  console.log(`${day}:`);
  assignByDay[day].forEach(a => {
    console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.subject.name.padEnd(20)} | ${a.teacher.name}`);
  });
  console.log('');
});

await p.$disconnect();
