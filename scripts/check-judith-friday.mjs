import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO VIERNES - JUDITH GIL\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Judith" } } 
});

const fridayAssignments = await p.assignment.findMany({
  where: { 
    teacherId: teacher.id,
    timeBlock: { dayOfWeek: 5 }
  },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: { timeBlock: { startTime: 'asc' } }
});

console.log('📅 HORARIO VIERNES ACTUAL:\n');

fridayAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name} [${a.id.substring(0, 8)}]`);
});

// Verificar última hora
const lastClass = fridayAssignments[fridayAssignments.length - 1];
if (lastClass) {
  const gradeName = `${lastClass.grade.name}${lastClass.grade.section || ""}`;
  console.log(`\n🔍 Última hora actual: ${lastClass.timeBlock.startTime} - ${gradeName}`);
  console.log('   Debe ser: 14:15-15:15 - 8A');
}

await p.$disconnect();
