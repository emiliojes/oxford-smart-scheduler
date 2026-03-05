import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const [timeBlocks, grades, subjects] = await Promise.all([
    prisma.timeBlock.findMany({ orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    prisma.grade.findMany({ orderBy: { name: 'asc' } }),
    prisma.subject.findMany({ orderBy: { name: 'asc' } }),
  ]);

  console.log('=== TIME BLOCKS ===');
  // Only unique times (day 1)
  const uniqueTimes = timeBlocks.filter(b => b.dayOfWeek === 1);
  uniqueTimes.forEach(b => console.log(`  ${b.startTime}-${b.endTime} | ${b.blockType} | dur:${b.duration} | id:${b.id}`));

  console.log('\n=== ALL TIME BLOCKS (all days) ===');
  timeBlocks.forEach(b => console.log(`  day${b.dayOfWeek} ${b.startTime}-${b.endTime} | ${b.blockType} | id:${b.id}`));

  console.log('\n=== GRADES ===');
  grades.forEach(g => console.log(`  ${g.name} ${g.section ?? ''} | ${g.level} | id:${g.id}`));

  console.log('\n=== SUBJECTS ===');
  subjects.forEach(s => console.log(`  ${s.name} | id:${s.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
