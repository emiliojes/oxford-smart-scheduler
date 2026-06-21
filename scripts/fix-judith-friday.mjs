import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO VIERNES - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });

// 1. ELIMINAR 11A de las 14:15
console.log('1. Eliminando 11A de las 14:15...');
const deleted11A = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 5, startTime: '14:15' },
    grade: { name: '11', section: 'A' }
  }
});
console.log(`   ✅ Eliminado ${deleted11A.count} assignment(s)\n`);

// 2. AGREGAR 8A a las 14:15 (última hora)
console.log('2. Agregando 8A a las 14:15 (última hora)...');
const grade8A = await p.grade.findFirst({ where: { name: '8', section: 'A' } });
const block1415 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 5, startTime: '14:15', blockType: 'CLASS' }
});

if (block1415 && grade8A) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: litSubject.id,
      gradeId: grade8A.id,
      timeBlockId: block1415.id,
      status: 'CONFIRMED'
    }
  });
  console.log('   ✅ Agregado 8A Literature 14:15-15:15\n');
}

// Mostrar horario actualizado
console.log('📅 HORARIO VIERNES ACTUALIZADO:\n');

const fridayAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 5 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

fridayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

await p.$disconnect();
