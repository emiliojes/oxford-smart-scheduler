import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 DETECTANDO CONFLICTOS DE TEACHERS\n');
console.log('Un conflicto ocurre cuando un teacher tiene múltiples asignaciones');
console.log('en bloques que se solapan el mismo día.\n');
console.log('='.repeat(80) + '\n');

// Función para convertir tiempo a minutos
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Función para verificar si dos bloques se solapan
function blocksOverlap(block1, block2) {
  const start1 = timeToMinutes(block1.startTime);
  const end1 = timeToMinutes(block1.endTime);
  const start2 = timeToMinutes(block2.startTime);
  const end2 = timeToMinutes(block2.endTime);
  
  return start1 < end2 && start2 < end1;
}

// Obtener todos los teachers
const teachers = await p.teacher.findMany({
  orderBy: { name: 'asc' }
});

const days = ['', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES'];
let totalConflicts = 0;
const teachersWithConflicts = [];

for (const teacher of teachers) {
  const assignments = await p.assignment.findMany({
    where: { teacherId: teacher.id },
    include: {
      subject: true,
      grade: true,
      timeBlock: true,
    },
    orderBy: [
      { timeBlock: { dayOfWeek: 'asc' } },
      { timeBlock: { startTime: 'asc' } }
    ]
  });
  
  // Agrupar por día
  const byDay = {};
  assignments.forEach(a => {
    if (!byDay[a.timeBlock.dayOfWeek]) {
      byDay[a.timeBlock.dayOfWeek] = [];
    }
    byDay[a.timeBlock.dayOfWeek].push(a);
  });
  
  // Verificar conflictos en cada día
  const conflicts = [];
  
  for (const day in byDay) {
    const dayAssignments = byDay[day];
    
    for (let i = 0; i < dayAssignments.length; i++) {
      for (let j = i + 1; j < dayAssignments.length; j++) {
        const a1 = dayAssignments[i];
        const a2 = dayAssignments[j];
        
        if (blocksOverlap(a1.timeBlock, a2.timeBlock)) {
          conflicts.push({
            day: parseInt(day),
            assignment1: a1,
            assignment2: a2
          });
        }
      }
    }
  }
  
  if (conflicts.length > 0) {
    totalConflicts += conflicts.length;
    teachersWithConflicts.push({ teacher, conflicts });
    
    console.log(`⚠️  ${teacher.name}`);
    console.log(`   ${conflicts.length} conflicto(s) encontrado(s):\n`);
    
    conflicts.forEach((conflict, index) => {
      const a1 = conflict.assignment1;
      const a2 = conflict.assignment2;
      const grade1 = `${a1.grade.name}${a1.grade.section || ''}`;
      const grade2 = `${a2.grade.name}${a2.grade.section || ''}`;
      
      console.log(`   ${index + 1}. ${days[conflict.day]}:`);
      console.log(`      • ${a1.timeBlock.startTime}-${a1.timeBlock.endTime}: ${grade1} ${a1.subject.name}`);
      console.log(`      • ${a2.timeBlock.startTime}-${a2.timeBlock.endTime}: ${grade2} ${a2.subject.name}`);
      console.log(`      ⚠️  Solapamiento: ${a1.timeBlock.startTime}-${a2.timeBlock.endTime}\n`);
    });
    
    console.log('');
  }
}

console.log('='.repeat(80));
console.log(`\n📊 RESUMEN:`);
console.log(`   Teachers con conflictos: ${teachersWithConflicts.length}`);
console.log(`   Total de conflictos: ${totalConflicts}\n`);

if (teachersWithConflicts.length === 0) {
  console.log('✅ No se encontraron conflictos de teachers!\n');
} else {
  console.log('Teachers afectados:');
  teachersWithConflicts.forEach(({ teacher, conflicts }) => {
    console.log(`   - ${teacher.name} (${conflicts.length} conflicto(s))`);
  });
  console.log('');
}

await p.$disconnect();
