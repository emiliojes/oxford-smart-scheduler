import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔄 MOVIENDO ASIGNACIONES A LOS BLOQUES CORRECTOS\n');

// Mapeo de bloques incorrectos a correctos
// 13:15-14:15 → 13:00-14:00
// 14:15-15:15 → 14:00-15:15

const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// 1. Mover asignaciones de 13:15-14:15 a 13:00-14:00
const assignments1315 = await p.assignment.findMany({
  where: {
    timeBlock: {
      level: "LOW_SECONDARY",
      startTime: "13:15",
      endTime: "14:15"
    }
  },
  include: {
    timeBlock: true,
    subject: true,
    teacher: true,
    grade: true
  }
});

console.log(`📦 Asignaciones en 13:15-14:15: ${assignments1315.length}\n`);

for (const assignment of assignments1315) {
  const newBlock = await p.timeBlock.findFirst({
    where: {
      level: "LOW_SECONDARY",
      dayOfWeek: assignment.timeBlock.dayOfWeek,
      startTime: "13:00",
      endTime: "14:00"
    }
  });
  
  if (newBlock) {
    await p.assignment.update({
      where: { id: assignment.id },
      data: { timeBlockId: newBlock.id }
    });
    console.log(`✅ ${days[assignment.timeBlock.dayOfWeek]} ${assignment.subject.name} (${assignment.teacher.name})`);
    console.log(`   Movido de 13:15-14:15 → 13:00-14:00`);
  } else {
    console.log(`❌ No se encontró bloque 13:00-14:00 para ${days[assignment.timeBlock.dayOfWeek]}`);
  }
}

console.log('\n');

// 2. Mover asignaciones de 14:15-15:15 a 14:00-15:15
const assignments1415 = await p.assignment.findMany({
  where: {
    timeBlock: {
      level: "LOW_SECONDARY",
      startTime: "14:15",
      endTime: "15:15"
    }
  },
  include: {
    timeBlock: true,
    subject: true,
    teacher: true,
    grade: true
  }
});

console.log(`📦 Asignaciones en 14:15-15:15: ${assignments1415.length}\n`);

for (const assignment of assignments1415) {
  const newBlock = await p.timeBlock.findFirst({
    where: {
      level: "LOW_SECONDARY",
      dayOfWeek: assignment.timeBlock.dayOfWeek,
      startTime: "14:00",
      endTime: "15:15"
    }
  });
  
  if (newBlock) {
    await p.assignment.update({
      where: { id: assignment.id },
      data: { timeBlockId: newBlock.id }
    });
    console.log(`✅ ${days[assignment.timeBlock.dayOfWeek]} ${assignment.subject.name} (${assignment.teacher.name})`);
    console.log(`   Movido de 14:15-15:15 → 14:00-15:15`);
  } else {
    console.log(`❌ No se encontró bloque 14:00-15:15 para ${days[assignment.timeBlock.dayOfWeek]}`);
  }
}

console.log('\n✅ Asignaciones movidas correctamente\n');

await p.$disconnect();
