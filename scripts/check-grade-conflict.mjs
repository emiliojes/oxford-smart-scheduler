import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Parámetros: grade, day, time
const gradeName = process.argv[2] || '10';
const gradeSection = process.argv[3] || 'B';
const dayOfWeek = parseInt(process.argv[4]) || 4; // Jueves
const startTime = process.argv[5] || '10:45';

console.log(`🔍 VERIFICANDO CONFLICTO: Grade ${gradeName}${gradeSection} - Día ${dayOfWeek} - ${startTime}\n`);

const grade = await p.grade.findFirst({
  where: { name: gradeName, section: gradeSection }
});

if (!grade) {
  console.log('❌ Grade no encontrado');
  await p.$disconnect();
  process.exit(1);
}

// Buscar todas las asignaciones de ese grade en ese día y hora
const assignments = await p.assignment.findMany({
  where: {
    gradeId: grade.id,
    timeBlock: {
      dayOfWeek: dayOfWeek,
      startTime: startTime
    }
  },
  include: {
    teacher: true,
    subject: true,
    timeBlock: true,
    room: true
  }
});

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

console.log(`📚 Clases de ${gradeName}${gradeSection} en ${days[dayOfWeek]} ${startTime}:\n`);

if (assignments.length === 0) {
  console.log('✅ No hay clases asignadas en este horario');
  console.log('   El conflicto puede ser con otro bloque que se solapa\n');
  
  // Buscar bloques que se solapen
  const overlappingBlocks = await p.timeBlock.findMany({
    where: {
      dayOfWeek: dayOfWeek,
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } }
          ]
        },
        {
          startTime: startTime
        }
      ]
    }
  });
  
  console.log(`⏰ Bloques de tiempo que incluyen ${startTime}:\n`);
  
  for (const block of overlappingBlocks) {
    const assignmentsInBlock = await p.assignment.findMany({
      where: {
        gradeId: grade.id,
        timeBlockId: block.id
      },
      include: {
        teacher: true,
        subject: true,
        room: true
      }
    });
    
    if (assignmentsInBlock.length > 0) {
      console.log(`  Bloque: ${block.startTime}-${block.endTime} (${block.duration} min)`);
      assignmentsInBlock.forEach(a => {
        console.log(`    → ${a.teacher.name} - ${a.subject.name}${a.room ? ` - ${a.room.name}` : ''}`);
      });
      console.log('');
    }
  }
  
} else {
  assignments.forEach((a, index) => {
    console.log(`${index + 1}. Teacher: ${a.teacher.name}`);
    console.log(`   Subject: ${a.subject.name}`);
    console.log(`   Time: ${a.timeBlock.startTime}-${a.timeBlock.endTime}`);
    console.log(`   Room: ${a.room?.name || 'Sin aula'}`);
    console.log(`   Status: ${a.status}\n`);
  });
}

await p.$disconnect();
