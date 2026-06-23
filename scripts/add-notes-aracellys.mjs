import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('📝 AGREGANDO NOTAS AL HORARIO DE ARACELLYS\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Aracellys" } }
});

// Actualizar asignaciones con notas específicas
const updates = [
  // Miércoles 12:30-13:30 - 4A Spanish
  {
    day: 3,
    startTime: '12:30',
    grade: '4',
    section: 'A',
    note: '12:30-1:30'
  },
  // Miércoles 07:30-08:15 - 5A SOC (si existe)
  {
    day: 3,
    startTime: '07:30',
    grade: '5',
    section: 'A',
    note: '7:30-8:15'
  }
];

let updated = 0;

for (const { day, startTime, grade, section, note } of updates) {
  const gradeObj = await p.grade.findFirst({
    where: { name: grade, section: section }
  });

  if (!gradeObj) {
    console.log(`⚠️  Grade ${grade}${section} no encontrado`);
    continue;
  }

  const assignment = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: gradeObj.id,
      timeBlock: {
        dayOfWeek: day,
        startTime: startTime
      }
    },
    include: {
      subject: true,
      grade: true,
      timeBlock: true
    }
  });

  if (!assignment) {
    console.log(`⚠️  No se encontró asignación: Día ${day} ${startTime} - ${grade}${section}`);
    continue;
  }

  await p.assignment.update({
    where: { id: assignment.id },
    data: { note: note }
  });

  console.log(`✅ Nota agregada: ${assignment.grade.name}${assignment.grade.section} ${assignment.subject.name} - "${note}"`);
  updated++;
}

console.log(`\n📊 Total actualizado: ${updated}\n`);

await p.$disconnect();
