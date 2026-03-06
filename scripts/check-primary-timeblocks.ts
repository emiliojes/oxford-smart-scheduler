import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Show day 1 time blocks only, ordered by start time
  const blocks = await prisma.timeBlock.findMany({
    where: { dayOfWeek: 1 },
    orderBy: { startTime: 'asc' },
  });

  console.log('=== TIME BLOCKS DAY 1 ===');
  blocks.forEach(b => {
    console.log(`  ${b.startTime}-${b.endTime} | ${b.blockType} | dur:${b.duration} | id:${b.id}`);
  });

  // Show what Katerin Martinez (KA) has on Monday as sample
  console.log('\n=== KATERIN MARTINEZ - MONDAY ===');
  const teacher = await prisma.teacher.findFirst({ where: { name: 'Katerin Martinez' } });
  if (teacher) {
    const assignments = await prisma.assignment.findMany({
      where: { teacherId: teacher.id, timeBlock: { dayOfWeek: 1 } },
      include: { subject: true, timeBlock: true },
      orderBy: { timeBlock: { startTime: 'asc' } },
    });
    assignments.forEach(a => {
      console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.timeBlock.blockType} | ${a.subject.name}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
