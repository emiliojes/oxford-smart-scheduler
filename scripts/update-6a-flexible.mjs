import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔄 ACTUALIZANDO HORARIO DE GRADE 6A (FLEXIBLE)\n');

// 1. Buscar Grade 6A
const grade = await p.grade.findFirst({
  where: { name: "6", section: "A" }
});

if (!grade) {
  console.log('❌ Grade 6A no encontrado');
  await p.$disconnect();
  process.exit(1);
}

console.log(`✅ Grade encontrado: ${grade.name}${grade.section}\n`);

// 2. Ver bloques disponibles para LOW_SECONDARY
const blocks = await p.timeBlock.findMany({
  where: { level: "LOW_SECONDARY" },
  orderBy: [
    { dayOfWeek: 'asc' },
    { startTime: 'asc' }
  ]
});

console.log(`📋 Bloques disponibles para LOW_SECONDARY: ${blocks.length}\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const byDay = {};
blocks.forEach(b => {
  const day = days[b.dayOfWeek];
  if (!byDay[day]) byDay[day] = [];
  byDay[day].push(b);
});

Object.keys(byDay).forEach(day => {
  console.log(`${day}:`);
  byDay[day].forEach(b => {
    console.log(`  ${b.startTime}-${b.endTime} (${b.blockType})`);
  });
  console.log('');
});

// 3. Eliminar asignaciones actuales de 6A
const deleted = await p.assignment.deleteMany({
  where: { gradeId: grade.id }
});

console.log(`🗑️  ${deleted.count} asignaciones eliminadas\n`);

// 4. Definir el horario según la imagen - usando los bloques que existen
const schedule = [
  // MONDAY
  { day: 1, startTime: "07:30", subject: "Homeroom", teacher: "Omely Rujano" },
  { day: 1, startTime: "08:30", subject: "Math", teacher: "Christian Ho San" },
  { day: 1, startTime: "09:45", subject: "English", teacher: "Vielka Vega" },
  { day: 1, startTime: "10:45", subject: "Social Studies", teacher: "Aracellys Dominguez" },
  { day: 1, startTime: "11:45", subject: "Music", teacher: "Adolfo Diaz" },
  { day: 1, startTime: "13:15", subject: "Science", teacher: "Karina Peñalba" },
  { day: 1, startTime: "14:15", subject: "Spanish", teacher: "Omely Rujano" },
  
  // TUESDAY
  { day: 2, startTime: "07:30", subject: "Science", teacher: "Karina Peñalba" },
  { day: 2, startTime: "08:30", subject: "Art", teacher: "Andrea Guerra" },
  { day: 2, startTime: "09:45", subject: "Math", teacher: "Christian Ho San" },
  { day: 2, startTime: "10:45", subject: "Literature", teacher: "Enis Rodriguez" },
  { day: 2, startTime: "11:45", subject: "English", teacher: "Vielka Vega" },
  { day: 2, startTime: "13:15", subject: "Spanish", teacher: "Omely Rujano" },
  { day: 2, startTime: "14:15", subject: "Social Studies", teacher: "Aracellys Dominguez" },
  
  // WEDNESDAY
  { day: 3, startTime: "07:30", subject: "Literature", teacher: "Enis Rodriguez" },
  { day: 3, startTime: "08:30", subject: "Spanish", teacher: "Omely Rujano" },
  { day: 3, startTime: "09:45", subject: "Math", teacher: "Christian Ho San" },
  { day: 3, startTime: "10:45", subject: "Social Studies", teacher: "Aracellys Dominguez" },
  { day: 3, startTime: "11:45", subject: "English", teacher: "Vielka Vega" },
  { day: 3, startTime: "13:15", subject: "French", teacher: "Elsi Diaz" },
  { day: 3, startTime: "14:15", subject: "Science", teacher: "Karina Peñalba" },
];

console.log('📝 Creando nuevas asignaciones...\n');

let created = 0;
let skipped = 0;

for (const item of schedule) {
  // Buscar time block que empiece a esta hora en este día
  const timeBlock = await p.timeBlock.findFirst({
    where: {
      dayOfWeek: item.day,
      startTime: item.startTime,
      blockType: "CLASS"
    }
  });
  
  if (!timeBlock) {
    console.log(`⚠️  Time block no encontrado: día ${item.day}, ${item.startTime}`);
    skipped++;
    continue;
  }
  
  // Buscar subject
  const subject = await p.subject.findFirst({
    where: { name: { contains: item.subject } }
  });
  
  if (!subject) {
    console.log(`⚠️  Subject no encontrado: ${item.subject}`);
    skipped++;
    continue;
  }
  
  // Buscar teacher
  const teacher = await p.teacher.findFirst({
    where: { name: { contains: item.teacher } }
  });
  
  if (!teacher) {
    console.log(`⚠️  Teacher no encontrado: ${item.teacher}`);
    skipped++;
    continue;
  }
  
  // Crear assignment
  await p.assignment.create({
    data: {
      gradeId: grade.id,
      subjectId: subject.id,
      teacherId: teacher.id,
      timeBlockId: timeBlock.id,
      status: "CONFIRMED"
    }
  });
  
  created++;
  console.log(`✅ ${days[item.day]} ${item.startTime} - ${item.subject} (${item.teacher})`);
}

console.log(`\n✅ ${created} asignaciones creadas`);
console.log(`⚠️  ${skipped} items omitidos\n`);

await p.$disconnect();
