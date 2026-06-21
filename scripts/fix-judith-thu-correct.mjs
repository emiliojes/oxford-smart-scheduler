import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO JUEVES - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });

// 1. ELIMINAR 11A de las 14:15
console.log('1. Eliminando 11A de las 14:15...');
const deleted11A = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '14:15' },
    grade: { name: '11', section: 'A' }
  }
});
console.log(`   ✅ Eliminado ${deleted11A.count} assignment(s)\n`);

// 2. ELIMINAR 12A de las 11:45 (si existe, para reemplazarlo con 8A)
console.log('2. Verificando 11:45...');
const at1145 = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '11:45' }
  },
  include: { grade: true }
});

if (at1145) {
  console.log(`   Actualmente: ${at1145.grade.name}${at1145.grade.section || ''}`);
  if (at1145.grade.name === '12' && at1145.grade.section === 'A') {
    await p.assignment.delete({ where: { id: at1145.id } });
    console.log('   ✅ Eliminado 12A de las 11:45\n');
  }
} else {
  console.log('   No hay clase a las 11:45\n');
}

// 3. AGREGAR 8A a las 11:45
console.log('3. Agregando 8A a las 11:45...');
const grade8A = await p.grade.findFirst({ where: { name: '8', section: 'A' } });
const block1145 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: '11:45', blockType: 'CLASS' }
});

if (block1145 && grade8A) {
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
