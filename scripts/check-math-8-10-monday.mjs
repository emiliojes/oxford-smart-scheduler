import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 BUSCANDO TEACHER MATH 8-10 - LUNES\n');

// Buscar teachers que enseñan Math a grados 8 o 10 el lunes
const mondayMathAssignments = await p.assignment.findMany({
  where: {
    timeBlock: { dayOfWeek: 1 },
    subject: { name: "Math" },
    grade: {
      name: { in: ['8', '10'] }
    }
  },
  include: {
    teacher: true,
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: [
    { teacher: { name: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

// Agrupar por teacher
const teacherGroups = {};
mondayMathAssignments.forEach(a => {
  if (!teacherGroups[a.teacher.name]) {
    teacherGroups[a.teacher.name] = [];
  }
  teacherGroups[a.teacher.name].push(a);
});

console.log('Teachers que enseñan Math 8-10 el lunes:\n');

Object.keys(teacherGroups).forEach(teacherName => {
  console.log(`\n📚 ${teacherName}:`);
  teacherGroups[teacherName].forEach(a => {
    const gradeName = `${a.grade.name}${a.grade.section || ""}`;
    console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
  });
});

// Según la imagen, el horario del lunes debería ser:
console.log('\n\n📋 HORARIO ESPERADO SEGÚN IMAGEN (LUNES):');
console.log('  07:30-08:30 - HOMEROOM');
console.log('  08:30-09:30 - 7B');
console.log('  09:45-10:45 - 8B');
console.log('  10:45-11:45 - 10B');
console.log('  11:45-12:45 - 8A');
console.log('  13:15-14:15 - 10A');

await p.$disconnect();
