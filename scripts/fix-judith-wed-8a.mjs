import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 AGREGANDO MIÉRCOLES 9:45 - 8A LITERATURE - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });
const grade8A = await p.grade.findFirst({ where: { name: '8', section: 'A' } });

console.log('📋 HORARIO MIÉRCOLES ACTUAL:\n');

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

// Verificar si ya existe 8A a las 9:45
const existing = wednesdayAssignments.find(a => 
  a.timeBlock.startTime === '09:45' && 
  a.grade.name === '8' && 
  a.grade.section === 'A'
);

if (existing) {
  console.log('\n✓ 8A ya existe a las 9:45\n');
} else {
  console.log('\n➕ Agregando 8A a las 9:45...\n');
  
  const block0945 = await p.timeBlock.findFirst({
    where: { dayOfWeek: 3, startTime: '09:45', blockType: 'CLASS' }
  });

  if (block0945 && grade8A && litSubject) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: litSubject.id,
        gradeId: grade8A.id,
        timeBlockId: block0945.id,
        status: 'CONFIRMED'
      }
    });
    console.log('✅ Agregado 8A Literature 09:45-10:45\n');
  }
}

// Mostrar horario actualizado
console.log('📅 HORARIO MIÉRCOLES ACTUALIZADO:\n');

const updatedAssignments = await p.assignment.findMany({
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

updatedAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

await p.$disconnect();
