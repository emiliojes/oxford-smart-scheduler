import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO JUEVES FINAL - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });

// 1. ELIMINAR 8A de las 11:45
console.log('1. Eliminando 8A de las 11:45...');
const deleted8A = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '11:45' },
    grade: { name: '8', section: 'A' }
  }
});
console.log(`   ✅ Eliminado ${deleted8A.count} assignment(s)\n`);

// 2. AGREGAR 12A a las 11:45 (antes del lunch)
console.log('2. Agregando 12A a las 11:45 (antes del lunch)...');
const grade12A = await p.grade.findFirst({ where: { name: '12', section: 'A' } });
const block1145 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '11:45', blockType: 'CLASS' }
});

if (block1145 && grade12A) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: litSubject.id,
      gradeId: grade12A.id,
      timeBlockId: block1145.id,
      status: 'CONFIRMED'
    }
  });
  console.log('   ✅ Agregado 12A Literature 11:45-12:45\n');
}

// 3. AGREGAR 11A a las 14:15 (última hora)
console.log('3. Agregando 11A a las 14:15 (última hora)...');
const grade11A = await p.grade.findFirst({ where: { name: '11', section: 'A' } });
const block1415 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '14:15', blockType: 'CLASS' }
});

if (block1415 && grade11A) {
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
    console.log('   ✅ Agregado 11A Literature 14:15-15:15\n');
  } else {
    console.log('   ✓ Ya existe\n');
  }
}

// Mostrar horario actualizado
console.log('📅 HORARIO JUEVES FINAL:\n');

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

console.log('\n✅ Ahora coincide con la imagen');

await p.$disconnect();
