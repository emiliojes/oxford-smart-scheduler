import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({
    where: { name: { startsWith: 'Primaria Teacher' } },
    include: {
      assignments: {
        include: { subject: true, timeBlock: true, grade: true },
        orderBy: [{ timeBlock: { dayOfWeek: 'asc' } }, { timeBlock: { startTime: 'asc' } }],
      },
    },
    orderBy: { name: 'asc' },
  });

  for (const t of teachers) {
    const grade = t.assignments[0]?.grade;
    const gradeLabel = grade ? `${grade.name}${grade.section}` : '?';
    console.log(`\n${t.name} → Grade ${gradeLabel} | ${t.assignments.length} assignments`);
    // Show Mon schedule as sample
    const mon = t.assignments.filter(a => a.timeBlock.dayOfWeek === 1);
    console.log('  LUNES:');
    mon.forEach(a => console.log(`    ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.subject.name}${a.note ? ' (' + a.note + ')' : ''}`));
  }
  console.log(`\nTotal teachers: ${teachers.length}`);
  console.log(`Total assignments: ${teachers.reduce((s, t) => s + t.assignments.length, 0)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
