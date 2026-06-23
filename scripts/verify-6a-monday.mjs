import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO LUNES DE 6A\n');

const grade = await p.grade.findFirst({
  where: { name: "6", section: "A" }
});

const assignments = await p.assignment.findMany({
  where: { 
    gradeId: grade.id,
    timeBlock: { dayOfWeek: 1 } // Lunes
  },
  include: {
    subject: true,
    teacher: true,
    timeBlock: true
  },
  orderBy: {
    timeBlock: { startTime: 'asc' }
  }
});

console.log(`📅 LUNES - Grade 6A (${assignments.length} clases):\n`);

assignments.forEach(a => {
  console.log(`${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.subject.name.padEnd(20)} | ${a.teacher.name}`);
});

console.log('\n');

await p.$disconnect();
