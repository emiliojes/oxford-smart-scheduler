import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔄 INTERCAMBIANDO ORDEN JUEVES T.S - IRLANDA TUÑON\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Irlanda" } } 
});

// Encontrar las dos asignaciones de Thinking and Skills del jueves
const ts11A = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '10:45' },
    grade: { name: '11', section: 'A' }
  },
  include: { timeBlock: true, grade: true }
});

const ts11B = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '09:45' },
    grade: { name: '11', section: 'B' }
  },
  include: { timeBlock: true, grade: true }
});

console.log('Estado actual:');
console.log(`  09:45: ${ts11B?.grade.name}${ts11B?.grade.section} T.S`);
console.log(`  10:45: ${ts11A?.grade.name}${ts11A?.grade.section} T.S`);

console.log('\nDebe ser:');
console.log('  09:45: 11A T.S');
console.log('  10:45: 11B T.S');

// Obtener los time blocks correctos
const block0945 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '09:45', blockType: 'CLASS' }
});

const block1045 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '10:45', blockType: 'CLASS' }
});

const grade11A = await p.grade.findFirst({ where: { name: '11', section: 'A' } });
const grade11B = await p.grade.findFirst({ where: { name: '11', section: 'B' } });

console.log('\n🔄 Intercambiando...\n');

// Actualizar 11B de 09:45 a 10:45
if (ts11B) {
  await p.assignment.update({
    where: { id: ts11B.id },
    data: { timeBlockId: block1045.id }
  });
  console.log(`✅ Movido 11B T.S de 09:45 a 10:45`);
}

// Actualizar 11A de 10:45 a 09:45
if (ts11A) {
  await p.assignment.update({
    where: { id: ts11A.id },
    data: { timeBlockId: block0945.id }
  });
  console.log(`✅ Movido 11A T.S de 10:45 a 09:45`);
}

console.log('\n📅 HORARIO JUEVES ACTUALIZADO:\n');

const juevesAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

juevesAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` (${a.note})` : "";
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note}`);
});

await p.$disconnect();
