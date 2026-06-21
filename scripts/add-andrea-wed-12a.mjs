import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('➕ AGREGANDO MIÉRCOLES 14:15 - 12A BIOLOGY - ANDREA CONCEPCION\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Andrea" }, name: { contains: "Concepcion" } } 
});

const biologySubject = await p.subject.findFirst({ where: { name: "Biology" } });

const grade12A = await p.grade.findFirst({
  where: { name: '12', section: 'A' }
});

const miercolesBlock = await p.timeBlock.findFirst({
  where: {
    dayOfWeek: 3,
    startTime: '14:15',
    level: { in: ['SECONDARY', 'BOTH'] },
    blockType: 'CLASS'
  }
});

console.log('Datos encontrados:');
console.log(`  Teacher: ${teacher?.name}`);
console.log(`  Subject: ${biologySubject?.name}`);
console.log(`  Grade: ${grade12A?.name}${grade12A?.section}`);
console.log(`  Time Block: ${miercolesBlock?.startTime}-${miercolesBlock?.endTime}\n`);

if (teacher && biologySubject && grade12A && miercolesBlock) {
  const existing = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: grade12A.id,
      timeBlockId: miercolesBlock.id
    }
  });
  
  if (!existing) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: biologySubject.id,
        gradeId: grade12A.id,
        timeBlockId: miercolesBlock.id,
        status: 'CONFIRMED'
      }
    });
    console.log('✅ Agregado Miércoles 14:15-15:15 - 12A Biology\n');
  } else {
    console.log('✓ Ya existe\n');
  }
} else {
  console.log('⚠️ No se encontraron todos los datos necesarios\n');
}

// Mostrar horario miércoles actualizado
console.log('📅 HORARIO MIÉRCOLES ACTUALIZADO:\n');

const miercolesAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 3 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

miercolesAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` (${a.note})` : "";
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note}`);
});

await p.$disconnect();
