import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO JUEVES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

const mathSubject = await p.subject.findFirst({ where: { name: "Math" } });
const grade7B = await p.grade.findFirst({ where: { name: '7', section: 'B' } });

// 1. ELIMINAR 7B de las 10:45
console.log('1. Eliminando 7B de las 10:45...');
const deleted = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '10:45' },
    grade: { name: '7', section: 'B' }
  }
});
console.log(`   ✅ Eliminado ${deleted.count} assignment(s)\n`);

// 2. AGREGAR 7B a las 13:15 (después del lunch)
console.log('2. Agregando 7B a las 13:15 (después del lunch)...');
const block1315 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '13:15', blockType: 'CLASS' }
});

if (block1315 && grade7B) {
  const existing = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: grade7B.id,
      timeBlockId: block1315.id
    }
  });
  
  if (!existing) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: mathSubject.id,
        gradeId: grade7B.id,
        timeBlockId: block1315.id,
        status: 'CONFIRMED'
      }
    });
    console.log('   ✅ Agregado 7B Math 13:15-14:15\n');
  } else {
    console.log('   ✓ Ya existe\n');
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

console.log('\n✅ Ahora 7B está después del lunch');

await p.$disconnect();
