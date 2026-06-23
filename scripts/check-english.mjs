import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO CLASES DE ENGLISH\n');

// Buscar subject English
const english = await p.subject.findFirst({
  where: { 
    OR: [
      { name: { contains: "English" } },
      { name: { contains: "Inglés" } },
      { name: { contains: "Ingles" } }
    ]
  }
});

if (!english) {
  console.log('❌ No se encontró la materia "English" en el sistema\n');
  console.log('📋 Materias disponibles:');
  const subjects = await p.subject.findMany({
    orderBy: { name: 'asc' }
  });
  subjects.forEach(s => {
    console.log(`   - ${s.name} (${s.level})`);
  });
  await p.$disconnect();
  process.exit(0);
}

console.log(`✅ Materia encontrada: ${english.name} (${english.level})\n`);

// Buscar todas las asignaciones de English
const assignments = await p.assignment.findMany({
  where: { subjectId: english.id },
  include: {
    teacher: true,
    subject: true,
    grade: true,
    timeBlock: true,
    room: true,
    conflicts: true
  },
  orderBy: [
    { teacher: { name: 'asc' } },
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

console.log(`📚 Total de asignaciones de English: ${assignments.length}\n`);

if (assignments.length === 0) {
  console.log('⚠️  No hay clases de English asignadas en el sistema\n');
  await p.$disconnect();
  process.exit(0);
}

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Agrupar por teacher
const byTeacher = {};
assignments.forEach(a => {
  const teacherName = a.teacher.name;
  if (!byTeacher[teacherName]) {
    byTeacher[teacherName] = [];
  }
  byTeacher[teacherName].push(a);
});

// Mostrar por teacher
Object.keys(byTeacher).sort().forEach(teacherName => {
  const teacherAssignments = byTeacher[teacherName];
  console.log(`\n📖 ${teacherName} (${teacherAssignments.length} clases):`);
  console.log('─'.repeat(60));
  
  teacherAssignments.forEach(a => {
    const day = days[a.timeBlock.dayOfWeek];
    const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
    const hasConflicts = a.conflicts.length > 0;
    const conflictIcon = hasConflicts ? '⚠️ ' : '✅';
    const note = a.note ? ` (${a.note})` : '';
    
    console.log(`  ${conflictIcon} ${day} ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName}${note}`);
    
    if (hasConflicts) {
      a.conflicts.forEach(c => {
        console.log(`      ⚠️  ${c.conflictType}: ${c.description}`);
      });
    }
  });
});

console.log('\n');

// Resumen de conflictos
const withConflicts = assignments.filter(a => a.conflicts.length > 0);
if (withConflicts.length > 0) {
  console.log(`⚠️  ${withConflicts.length} clases con conflictos\n`);
} else {
  console.log(`✅ Todas las clases sin conflictos\n`);
}

await p.$disconnect();
