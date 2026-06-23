import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔄 COMPLETANDO HORARIO DE GRADE 6A (Agregando clases después del lunch)\n');

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

// 2. Agregar las clases que faltan después del lunch según la imagen
const missingClasses = [
  // LUNES - después del lunch (11:45-12:45 Music ya existe)
  // Ya tiene: 13:15 Science, 14:15 Spanish
  
  // MARTES - después del lunch (11:45-12:45 English ya existe)
  // Ya tiene: 13:15 Spanish, 14:15 Social Studies
  
  // MIÉRCOLES - después del lunch (11:45-12:45 English ya existe)
  // Ya tiene: 13:15 French, 14:15 Science
  
  // JUEVES - FALTAN TODAS LAS CLASES
  { day: 4, startTime: "07:30", subject: "Math", teacher: "Christian Ho San" },
  { day: 4, startTime: "08:30", subject: "French", teacher: "Elsi Diaz" },
  { day: 4, startTime: "09:45", subject: "Computing", teacher: "Emilio Núñez" },
  { day: 4, startTime: "10:45", subject: "English", teacher: "Vielka Vega" },
  { day: 4, startTime: "12:00", subject: "Literature", teacher: "Enis Rodriguez" },
  { day: 4, startTime: "13:15", subject: "Science", teacher: "Karina Peñalba" },
  
  // VIERNES - FALTAN TODAS LAS CLASES
  { day: 5, startTime: "07:30", subject: "Science", teacher: "Karina Peñalba" },
  { day: 5, startTime: "09:45", subject: "Math", teacher: "Christian Ho San" },
  { day: 5, startTime: "10:45", subject: "Spanish", teacher: "Omely Rujano" },
  { day: 5, startTime: "12:00", subject: "English", teacher: "Vielka Vega" },
];

console.log('📝 Agregando clases faltantes...\n');

let created = 0;
let skipped = 0;

for (const item of missingClasses) {
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
  
  // Verificar si ya existe
  const existing = await p.assignment.findFirst({
    where: {
      gradeId: grade.id,
      timeBlockId: timeBlock.id
    }
  });
  
  if (existing) {
    console.log(`⏭️  Ya existe: día ${item.day}, ${item.startTime} - ${item.subject}`);
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
  const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  console.log(`✅ ${days[item.day]} ${item.startTime} - ${item.subject} (${item.teacher})`);
}

console.log(`\n✅ ${created} asignaciones creadas`);
console.log(`⚠️  ${skipped} items omitidos\n`);

await p.$disconnect();
