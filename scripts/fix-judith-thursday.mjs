import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 AGREGANDO JUEVES 14:15 - 11A LITERATURE - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });
const grade11A = await p.grade.findFirst({ where: { name: '11', section: 'A' } });

const block1415 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '14:15', blockType: 'CLASS' }
});

console.log('Datos encontrados:');
console.log(`  Teacher: ${teacher?.name}`);
console.log(`  Subject: ${litSubject?.name}`);
console.log(`  Grade: ${grade11A?.name}${grade11A?.section}`);
console.log(`  Time Block: ${block1415?.startTime}-${block1415?.endTime}\n`);

if (teacher && litSubject && grade11A && block1415) {
  const existing = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: grade11A.id,
      timeBlockId: block1415.id
    }
  });
  
  if (!existing) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: litSubject.id,
        gradeId: grade11A.id,
        timeBlockId: block1415.id,
        status: 'CONFIRMED'
      }
    });
    console.log('✅ Agregado Jueves 14:15-15:15 - 11A Literature\n');
  } else {
    console.log('✓ Ya existe\n');
  }
}

// Mostrar horario actualizado
console.log('📅 HORARIO JUEVES ACTUALIZADO:\n');

const thursdayAssignments = await p.assignment.findMany({
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

thursdayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

await p.$disconnect();
