import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO MIÉRCOLES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

const mathSubject = await p.subject.findFirst({ where: { name: "Math" } });

// 1. ELIMINAR 7B de las 07:30 (duplicado)
console.log('1. Eliminando 7B de las 07:30 (duplicado)...');
const deleted7B = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 3, startTime: '07:30' },
    grade: { name: '7', section: 'B' }
  }
});
console.log(`   ✅ Eliminado ${deleted7B.count} assignment(s)\n`);

// 2. AGREGAR 7B a las 08:30-09:30
console.log('2. Agregando 7B a las 08:30-09:30...');
const grade7B = await p.grade.findFirst({ where: { name: '7', section: 'B' } });
const block0830 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 3, startTime: '08:30', blockType: 'CLASS' }
});

if (block0830 && grade7B) {
  const existing = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: grade7B.id,
      timeBlockId: block0830.id
    }
  });
  
  if (!existing) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: mathSubject.id,
        gradeId: grade7B.id,
        timeBlockId: block0830.id,
        status: 'CONFIRMED'
      }
    });
    console.log('   ✅ Agregado 7B Math 08:30-09:30\n');
  } else {
    console.log('   ✓ Ya existe\n');
  }
}

// 3. MOVER 8B de 13:00 a 13:15
console.log('3. Moviendo 8B de 13:00 a 13:15...');
const grade8B = await p.grade.findFirst({ where: { name: '8', section: 'B' } });

// Eliminar de 13:00
const deleted8B = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 3, startTime: '13:00' },
    grade: { name: '8', section: 'B' }
  }
});
console.log(`   Eliminado de 13:00: ${deleted8B.count} assignment(s)`);

// Agregar a 13:15
const block1315 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 3, startTime: '13:15', blockType: 'CLASS' }
});

if (block1315 && grade8B) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: mathSubject.id,
      gradeId: grade8B.id,
      timeBlockId: block1315.id,
      status: 'CONFIRMED'
    }
  });
  console.log('   ✅ Agregado 8B Math 13:15-14:15\n');
}

// Mostrar horario actualizado
console.log('📅 HORARIO MIÉRCOLES ACTUALIZADO:\n');

const wednesdayAssignments = await p.assignment.findMany({
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

wednesdayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

await p.$disconnect();
