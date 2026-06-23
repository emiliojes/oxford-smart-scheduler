import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO HORARIO DE GRADE 6A\n');

const grade = await p.grade.findFirst({
  where: { 
    name: "6",
    section: "A"
  }
});

if (!grade) {
  console.log('❌ Grade 6A no encontrado\n');
  await p.$disconnect();
  process.exit(1);
}

console.log(`✅ Grade encontrado: ${grade.name}${grade.section}\n`);

const assignments = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: {
    teacher: true,
    subject: true,
    timeBlock: true,
    room: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

console.log(`📚 Total de asignaciones: ${assignments.length}\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const byDay = {};
assignments.forEach(a => {
  const day = days[a.timeBlock.dayOfWeek];
  if (!byDay[day]) byDay[day] = [];
  byDay[day].push(a);
});

Object.keys(byDay).forEach(day => {
  console.log(`\n📅 ${day}:`);
  console.log('─'.repeat(70));
  byDay[day].forEach(a => {
    console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.subject.name.padEnd(20)} | ${a.teacher.name}`);
  });
});

console.log('\n');

await p.$disconnect();
