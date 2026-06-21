import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO VIERNES - JUDITH GIL (última hora 11:45)\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });

// 1. ELIMINAR 8A de las 14:15 (no es la última hora)
console.log('1. Eliminando 8A de las 14:15...');
const deleted1415 = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 5, startTime: '14:15' }
  }
});
console.log(`   ✅ Eliminado ${deleted1415.count} assignment(s)\n`);

// 2. AGREGAR 8A a las 11:45 (última hora del viernes)
console.log('2. Agregando 8A a las 11:45 (última hora del viernes)...');
const grade8A = await p.grade.findFirst({ where: { name: '8', section: 'A' } });
const block1145 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 5, startTime: '11:45', blockType: 'CLASS' }
});

if (block1145 && grade8A) {
  const existing = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: grade8A.id,
      timeBlockId: block1145.id
    }
  });
  
  if (!existing) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: litSubject.id,
        gradeId: grade8A.id,
        timeBlockId: block1145.id,
        status: 'CONFIRMED'
      }
    });
    console.log('   ✅ Agregado 8A Literature 11:45-12:45\n');
  } else {
    console.log('   ✓ Ya existe\n');
  }
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

console.log('\n✅ Última hora del viernes es 11:45');

await p.$disconnect();
