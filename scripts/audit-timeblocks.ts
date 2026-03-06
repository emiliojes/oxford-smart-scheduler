import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const blocks = await prisma.timeBlock.findMany({
    where: { dayOfWeek: 1 },
    orderBy: { startTime: 'asc' },
  });

  console.log('=== DAY 1 TIME BLOCKS WITH LEVEL ===');
  blocks.forEach(b => {
    console.log(`  ${b.startTime}-${b.endTime} | ${b.blockType.padEnd(12)} | level:${b.level} | id:${b.id.slice(0,8)}`);
  });

  // Count by level
  console.log('\n=== BY LEVEL (all days combined, day 1 only) ===');
  const byLevel: Record<string, number> = {};
  blocks.forEach(b => { byLevel[b.level] = (byLevel[b.level] ?? 0) + 1; });
  Object.entries(byLevel).forEach(([l, c]) => console.log(`  ${l}: ${c} blocks`));

  // Show BREAK blocks specifically
  console.log('\n=== BREAK BLOCKS (all days) ===');
  const breaks = await prisma.timeBlock.findMany({
    where: { blockType: 'BREAK' },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  breaks.forEach(b => console.log(`  day${b.dayOfWeek} ${b.startTime}-${b.endTime} | level:${b.level} | id:${b.id.slice(0,8)}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
