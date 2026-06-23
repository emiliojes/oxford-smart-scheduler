import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO SOLAPAMIENTOS EN MIÉRCOLES 8:30 - ENIS\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Enis" } }
});

// Buscar TODOS los time blocks que incluyan 8:30 el miércoles
const timeBlocks = await p.timeBlock.findMany({
  where: {
    dayOfWeek: 3,
    OR: [
      { startTime: '08:30' },
      { 
        AND: [
          { startTime: { lt: '08:30' } },
          { endTime: { gt: '08:30' } }
        ]
      }
    ]
  }
});

console.log(`⏰ Time blocks que incluyen Miércoles 8:30: ${timeBlocks.length}\n`);

timeBlocks.forEach(tb => {
  console.log(`  - ${tb.startTime}-${tb.endTime} (${tb.duration} min) [${tb.level}] ${tb.blockType}`);
});

console.log('\n🔍 Asignaciones de Enis que podrían solaparse:\n');

// Buscar todas las asignaciones de Enis el miércoles que puedan solaparse
const assignments = await p.assignment.findMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { 
      dayOfWeek: 3,
      id: { in: timeBlocks.map(tb => tb.id) }
    }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true
  },
  orderBy: {
    timeBlock: { startTime: 'asc' }
  }
});

console.log(`Total: ${assignments.length} asignaciones\n`);

assignments.forEach(a => {
  const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name} [${a.status}]`);
});

// Verificar si hay solapamiento real
console.log('\n🔍 ANÁLISIS DE SOLAPAMIENTO:\n');

for (let i = 0; i < assignments.length; i++) {
  for (let j = i + 1; j < assignments.length; j++) {
    const a1 = assignments[i];
    const a2 = assignments[j];
    
    const start1 = a1.timeBlock.startTime;
    const end1 = a1.timeBlock.endTime;
    const start2 = a2.timeBlock.startTime;
    const end2 = a2.timeBlock.endTime;
    
    // Verificar solapamiento
    if (start1 < end2 && start2 < end1) {
      const grade1 = a1.grade ? `${a1.grade.name}${a1.grade.section || ''}` : 'N/A';
      const grade2 = a2.grade ? `${a2.grade.name}${a2.grade.section || ''}` : 'N/A';
      
      console.log(`⚠️  SOLAPAMIENTO DETECTADO:`);
      console.log(`   1. ${start1}-${end1} - ${grade1} ${a1.subject.name}`);
      console.log(`   2. ${start2}-${end2} - ${grade2} ${a2.subject.name}`);
      console.log('');
    }
  }
}

await p.$disconnect();
