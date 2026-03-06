import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const DAYS = ['', 'MON', 'TUE', 'WED', 'THU', 'FRI'];

async function main() {
  const teacher = await prisma.teacher.findFirst({ where: { name: 'Katerin Martinez' } });
  if (!teacher) return;

  const assignments = await prisma.assignment.findMany({
    where: { teacherId: teacher.id },
    include: { subject: true, timeBlock: true },
    orderBy: [{ timeBlock: { dayOfWeek: 'asc' } }, { timeBlock: { startTime: 'asc' } }],
  });

  for (let day = 1; day <= 5; day++) {
    const dayA = assignments.filter(a => a.timeBlock.dayOfWeek === day);
    console.log(`\n${DAYS[day]}:`);
    dayA.forEach(a => console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.timeBlock.blockType} | ${a.subject.name}`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
