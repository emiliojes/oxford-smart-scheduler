import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔄 ACTUALIZANDO HORARIO DE GRADE 6A\n');

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

// 2. Eliminar todas las asignaciones actuales de 6A
const deleted = await p.assignment.deleteMany({
  where: { gradeId: grade.id }
});

console.log(`🗑️  ${deleted.count} asignaciones eliminadas\n`);

// 3. Definir el nuevo horario según la imagen
const schedule = [
  // MONDAY
  { day: 1, time: "07:15-07:30", subject: "Registration", teacher: null },
  { day: 1, time: "07:30-08:30", subject: "Homeroom", teacher: "Omely Rujano" },
  { day: 1, time: "08:30-09:30", subject: "Math", teacher: "Christian Ho San" },
  { day: 1, time: "09:30-09:45", subject: "Break", teacher: null },
  { day: 1, time: "09:45-10:45", subject: "English", teacher: "Vielka Vega" },
  { day: 1, time: "10:45-11:45", subject: "Social Studies", teacher: "Aracellys Dominguez" },
  { day: 1, time: "11:45-12:45", subject: "Music", teacher: "Adolfo Diaz" },
  { day: 1, time: "12:45-13:15", subject: "Lunch", teacher: null },
  { day: 1, time: "13:15-14:15", subject: "Science", teacher: "Karina Peñalba" },
  { day: 1, time: "14:15-15:15", subject: "Spanish", teacher: "Omely Rujano" },
  
  // TUESDAY
  { day: 2, time: "07:15-07:30", subject: "Registration", teacher: null },
  { day: 2, time: "07:30-08:30", subject: "Science", teacher: "Karina Peñalba" },
  { day: 2, time: "08:30-09:30", subject: "Art", teacher: "Andrea Guerra" },
  { day: 2, time: "09:30-09:45", subject: "Break", teacher: null },
  { day: 2, time: "09:45-10:45", subject: "Math", teacher: "Christian Ho San" },
  { day: 2, time: "10:45-11:45", subject: "Literature", teacher: "Enis Rodriguez" },
  { day: 2, time: "11:45-12:45", subject: "English", teacher: "Vielka Vega" },
  { day: 2, time: "12:45-13:15", subject: "Lunch", teacher: null },
  { day: 2, time: "13:15-14:15", subject: "Spanish", teacher: "Omely Rujano" },
  { day: 2, time: "14:15-15:15", subject: "Social Studies", teacher: "Aracellys Dominguez" },
  
  // WEDNESDAY
  { day: 3, time: "07:15-07:30", subject: "Registration", teacher: null },
  { day: 3, time: "07:30-08:30", subject: "Literature", teacher: "Enis Rodriguez" },
  { day: 3, time: "08:30-09:30", subject: "Spanish", teacher: "Omely Rujano" },
  { day: 3, time: "09:30-09:45", subject: "Break", teacher: null },
  { day: 3, time: "09:45-10:45", subject: "Math", teacher: "Christian Ho San" },
  { day: 3, time: "10:45-11:45", subject: "Social Studies", teacher: "Aracellys Dominguez" },
  { day: 3, time: "11:45-12:45", subject: "English", teacher: "Vielka Vega" },
  { day: 3, time: "12:45-13:15", subject: "Lunch", teacher: null },
  { day: 3, time: "13:15-14:15", subject: "French", teacher: "Elsi Diaz" },
  { day: 3, time: "14:15-15:15", subject: "Science", teacher: "Karina Peñalba" },
  { day: 3, time: "15:15-15:15", subject: "Departure", teacher: null },
];

console.log('📝 Creando nuevas asignaciones...\n');

let created = 0;
let skipped = 0;

for (const item of schedule) {
  const [startTime, endTime] = item.time.split('-');
  
  // Buscar time block
  const timeBlock = await p.timeBlock.findFirst({
    where: {
      dayOfWeek: item.day,
      startTime: startTime,
      endTime: endTime
    }
  });
  
  if (!timeBlock) {
    console.log(`⚠️  Time block no encontrado: ${item.time} (día ${item.day})`);
    skipped++;
    continue;
  }
  
  // Si es Registration, Break, Lunch o Departure, skip (no son clases)
  if (!item.teacher) {
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
  console.log(`✅ ${item.time} - ${item.subject} (${item.teacher})`);
}

console.log(`\n✅ ${created} asignaciones creadas`);
console.log(`⚠️  ${skipped} items omitidos\n`);

await p.$disconnect();
