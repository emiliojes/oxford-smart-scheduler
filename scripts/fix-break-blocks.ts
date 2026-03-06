import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // PRIMARY schedule: break is 09:00-09:15
  // SECONDARY schedule: break is 09:30-09:45
  // Problem: there are PRIMARY-level blocks at 09:30-09:45 that shouldn't exist
  // These cause a double BREAK row in the PRIMARY schedule grid

  console.log('=== FIXING BREAK BLOCKS ===\n');

  // 1. Find all 09:30-09:45 BREAK blocks marked as PRIMARY — these are wrong
  const wrongPrimaryBreaks = await prisma.timeBlock.findMany({
    where: { startTime: '09:30', endTime: '09:45', blockType: 'BREAK', level: 'PRIMARY' },
  });
  console.log(`09:30-09:45 PRIMARY BREAK blocks (wrong): ${wrongPrimaryBreaks.length}`);

  for (const b of wrongPrimaryBreaks) {
    // Check if any assignments use this block
    const assignCount = await prisma.assignment.count({ where: { timeBlockId: b.id } });
    console.log(`  day${b.dayOfWeek} id:${b.id.slice(0,8)} | assignments:${assignCount}`);
    if (assignCount === 0) {
      await prisma.timeBlock.delete({ where: { id: b.id } });
      console.log(`    DELETED`);
    } else {
      console.log(`    SKIPPED (has assignments)`);
    }
  }

  // 2. Also fix 09:30-09:45 SECONDARY blocks — make sure they stay as SECONDARY
  const secBreaks = await prisma.timeBlock.findMany({
    where: { startTime: '09:30', endTime: '09:45', blockType: 'BREAK', level: 'SECONDARY' },
  });
  console.log(`\n09:30-09:45 SECONDARY BREAK blocks (correct): ${secBreaks.length}`);
  secBreaks.forEach(b => console.log(`  day${b.dayOfWeek} id:${b.id.slice(0,8)}`));

  // 3. Verify PRIMARY breaks are 09:00-09:15
  const primaryBreaks = await prisma.timeBlock.findMany({
    where: { startTime: '09:00', endTime: '09:15', blockType: 'BREAK', level: 'PRIMARY' },
  });
  console.log(`\n09:00-09:15 PRIMARY BREAK blocks (correct): ${primaryBreaks.length}`);
  primaryBreaks.forEach(b => console.log(`  day${b.dayOfWeek} id:${b.id.slice(0,8)}`));

  console.log('\nDone.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
