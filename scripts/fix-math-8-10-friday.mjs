import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO VIERNES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

const mathSubject = await p.subject.findFirst({ where: { name: "Math" } });

// 1. ELIMINAR 8A de las 10:45-11:30 (bloque incorrecto)
console.log('1. Eliminando 8A de las 10:45-11:30 (bloque incorrecto)...');
const deleted8A = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 5, startTime: '10:45' },
    grade: { name: '8', section: 'A' }
  }
});
console.log(`   ✅ Eliminado ${deleted8A.count} assignment(s)\n`);

// 2. ELIMINAR 7B de las 10:45-11:30 (bloque incorrecto)
console.log('2. Eliminando 7B de las 10:45-11:30 (bloque incorrecto)...');
const deleted7B = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 5, startTime: '10:45' },
    grade: { name: '7', section: 'B' }
  }
});
console.log(`   ✅ Eliminado ${deleted7B.count} assignment(s)\n`);

// 3. AGREGAR 8A a las 10:45-11:45
console.log('3. Agregando 8A a las 10:45-11:45...');
const grade8A = await p.grade.findFirst({ where: { name: '8', section: 'A' } });
const block1045 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 5, startTime: '10:45', endTime: '11:45', blockType: 'CLASS' }
});

if (block1045 && grade8A) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: mathSubject.id,
      gradeId: grade8A.id,
      timeBlockId: block1045.id,
      status: 'CONFIRMED'
    }
  });
  console.log('   ✅ Agregado 8A Math 10:45-11:45\n');
} else {
  console.log('   ⚠️ No se encontró el time block 10:45-11:45\n');
}

// 4. AGREGAR 7B a las 11:45-12:45
console.log('4. Agregando 7B a las 11:45-12:45...');
const grade7B = await p.grade.findFirst({ where: { name: '7', section: 'B' } });
const block1145 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 5, startTime: '11:45', blockType: 'CLASS' }
});

if (block1145 && grade7B) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: mathSubject.id,
      gradeId: grade7B.id,
      timeBlockId: block1145.id,
      status: 'CONFIRMED'
    }
  });
  console.log('   ✅ Agregado 7B Math 11:45-12:45\n');
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
