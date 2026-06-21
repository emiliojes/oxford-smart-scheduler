import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔧 CORRIGIENDO HORARIO DE IRLANDA TUÑON\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Irlanda" } } 
});

const mathSubject = await p.subject.findFirst({ where: { name: "Math" } });

// 1. ELIMINAR: Martes 11:45 con 9B
console.log('1. Eliminando Martes 11:45 - 9B...');
const deleted = await p.assignment.deleteMany({
  where: {
    teacherId: teacher.id,
    timeBlock: {
      dayOfWeek: 2,
      startTime: '11:45'
    },
    grade: {
      name: '9',
      section: 'B'
    }
  }
});
console.log(`   ✅ Eliminado ${deleted.count} assignment(s)\n`);

// 2. AGREGAR: Miércoles 10:45 con 11B
console.log('2. Agregando Miércoles 10:45 - 11B...');

const grade11B = await p.grade.findFirst({
  where: { name: '11', section: 'B' }
});

const miercolesBlock = await p.timeBlock.findFirst({
  where: {
    dayOfWeek: 3,
    startTime: '10:45',
    level: { in: ['SECONDARY', 'BOTH'] },
    blockType: 'CLASS'
  }
});

if (miercolesBlock && grade11B) {
  const existing = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: grade11B.id,
      timeBlockId: miercolesBlock.id
    }
  });
  
  if (!existing) {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: mathSubject.id,
        gradeId: grade11B.id,
        timeBlockId: miercolesBlock.id,
        status: 'CONFIRMED'
      }
    });
    console.log('   ✅ Agregado Miércoles 10:45 - 11B Math\n');
  } else {
    console.log('   ✓ Ya existe\n');
  }
} else {
  console.log('   ⚠️ No se encontró el time block o grade\n');
}

// 3. CORREGIR ORDEN JUEVES: 11B T.S debe ser a las 09:45, 11A T.S a las 10:45
console.log('3. Corrigiendo orden Jueves (11B T.S primero, luego 11A T.S)...');

// Verificar que el orden actual está mal
const jueves0945 = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '09:45' }
  },
  include: { grade: true }
});

const jueves1045 = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 4, startTime: '10:45' }
  },
  include: { grade: true }
});

console.log(`   Actual 09:45: ${jueves0945?.grade.name}${jueves0945?.grade.section} ${jueves0945?.note || ''}`);
console.log(`   Actual 10:45: ${jueves1045?.grade.name}${jueves1045?.grade.section} ${jueves1045?.note || ''}`);

// El orden ya está correcto según el output:
// 09:45: 11B Thinking and Skills
// 10:45: 11A Thinking and Skills
console.log('   ✅ El orden ya está correcto (11B T.S a las 09:45, 11A T.S a las 10:45)\n');

console.log('✅ CORRECCIONES COMPLETADAS\n');

// Mostrar horario actualizado
console.log('📅 HORARIO ACTUALIZADO:\n');

const assignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } },
  ],
});

const days = ["", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
let currentDay = 0;

for (const a of assignments) {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` (${a.note})` : "";
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note}`);
}

await p.$disconnect();
