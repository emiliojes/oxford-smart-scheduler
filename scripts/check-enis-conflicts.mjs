import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO CONFLICTOS DE T. ENIS RODRIGUEZ\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Enis" } }
});

if (!teacher) {
  console.log('❌ Teacher Enis no encontrado');
  await p.$disconnect();
  process.exit(1);
}

console.log(`Teacher: ${teacher.name}`);
console.log(`ID: ${teacher.id}\n`);

// Buscar todas las asignaciones con conflictos
const conflictAssignments = await p.assignment.findMany({
  where: {
    teacherId: teacher.id,
    status: 'CONFLICT'
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
    conflicts: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

console.log(`📊 Asignaciones con conflictos: ${conflictAssignments.length}\n`);

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

conflictAssignments.forEach((a, index) => {
  const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
  console.log(`${index + 1}. ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
  console.log(`   Status: ${a.status}`);
  console.log(`   Conflictos registrados: ${a.conflicts.length}`);
  
  if (a.conflicts.length > 0) {
    a.conflicts.forEach(c => {
      console.log(`     - ${c.conflictType}: ${c.description} (${c.severity})`);
    });
  }
  console.log('');
});

// Verificar específicamente Miércoles 8:30 - 7B
console.log('🔍 DETALLE: Miércoles 8:30 - 7B Literature\n');

const wed830 = await p.assignment.findFirst({
  where: {
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 3, startTime: '08:30' },
    grade: { name: '7', section: 'B' }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
    conflicts: true
  }
});

if (wed830) {
  console.log(`Asignación ID: ${wed830.id}`);
  console.log(`Time Block: ${wed830.timeBlock.startTime} - ${wed830.timeBlock.endTime}`);
  console.log(`Duration: ${wed830.timeBlock.duration} min`);
  console.log(`Block Type: ${wed830.timeBlock.blockType}`);
  console.log(`Block Level: ${wed830.timeBlock.level}`);
  console.log(`Status: ${wed830.status}\n`);
  
  console.log('Conflictos:');
  wed830.conflicts.forEach(c => {
    console.log(`  - ${c.conflictType}: ${c.description} (${c.severity})`);
  });
  
  // Buscar otras asignaciones en el mismo horario
  console.log('\n🔍 Otras asignaciones de Enis en Miércoles 8:30:\n');
  
  const otherAssignments = await p.assignment.findMany({
    where: {
      teacherId: teacher.id,
      timeBlock: { dayOfWeek: 3, startTime: '08:30' },
      id: { not: wed830.id }
    },
    include: {
      subject: true,
      grade: true,
      timeBlock: true
    }
  });
  
  if (otherAssignments.length > 0) {
    otherAssignments.forEach(a => {
      const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
      console.log(`  - ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
    });
  } else {
    console.log('  No hay otras asignaciones en el mismo horario');
  }
}

console.log('');

await p.$disconnect();
