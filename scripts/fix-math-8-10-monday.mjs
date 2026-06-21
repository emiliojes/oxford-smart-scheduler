import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO LUNES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
});

const mathSubject = await p.subject.findFirst({ where: { name: "Math" } });
const hrSubject = await p.subject.findFirst({ where: { name: "Homeroom" } });

console.log(`Teacher: ${teacher.name}\n`);

// 1. ELIMINAR: 8A a las 12:00-13:00 (bloque incorrecto)
console.log('1. Eliminando 8A a las 12:00-13:00 (bloque incorrecto)...');
const deleted = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 1, startTime: '12:00' },
    grade: { name: '8', section: 'A' }
  }
});
console.log(`   ✅ Eliminado ${deleted.count} assignment(s)\n`);

// 2. AGREGAR: 8A a las 11:45-12:45
console.log('2. Agregando 8A a las 11:45-12:45...');
const grade8A = await p.grade.findFirst({ where: { name: '8', section: 'A' } });
const block1145 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 1, startTime: '11:45', blockType: 'CLASS' }
});

if (block1145 && grade8A) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: mathSubject.id,
      gradeId: grade8A.id,
      timeBlockId: block1145.id,
      status: 'CONFIRMED'
    }
  });
  console.log('   ✅ Agregado 8A Math 11:45-12:45\n');
}

// 3. AGREGAR: 7B a las 08:30-09:30
console.log('3. Agregando 7B a las 08:30-09:30...');
const grade7B = await p.grade.findFirst({ where: { name: '7', section: 'B' } });
const block0830 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 1, startTime: '08:30', blockType: 'CLASS' }
});

if (block0830 && grade7B) {
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
}

// 4. AGREGAR: HOMEROOM a las 07:30-08:30
console.log('4. Agregando HOMEROOM a las 07:30-08:30...');
const block0730 = await p.timeBlock.findFirst({
  where: { dayOfWeek: 1, startTime: '07:30', blockType: 'CLASS' }
});

if (block0730 && hrSubject) {
  // Necesitamos saber qué grade es el homeroom - asumiendo que es uno de los grados que enseña
  // Por ahora lo saltamos hasta que confirmes qué grade
  console.log('   ⚠️  Necesito confirmar qué grade es el HOMEROOM\n');
}

// Mostrar horario actualizado
console.log('📅 HORARIO LUNES ACTUALIZADO:\n');

const mondayAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 1 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

mondayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

await p.$disconnect();
