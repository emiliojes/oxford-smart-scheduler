import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO VIERNES - MATH 8-10\n');

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "TBD - Math 8-10" } } 
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

console.log('\n📋 ESPERADO SEGÚN IMAGEN:');
console.log('  07:30-08:30 - 10A');
console.log('  08:30-09:30 - 8B');
console.log('  09:45-10:45 - 10B');
console.log('  10:45-11:45 - 8A');
console.log('  11:45-12:45 - 7B');
console.log('  12:45-13:15 - STUDENT DISMISSAL DUTY');

await p.$disconnect();
