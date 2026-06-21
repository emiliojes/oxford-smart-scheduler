import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('📅 TIME BLOCKS BY LEVEL\n');

// Get all time blocks grouped by level
const levels = ['PRIMARY', 'LOW_SECONDARY', 'SECONDARY', 'BOTH'];

for (const level of levels) {
  const blocks = await p.timeBlock.findMany({
    where: { level, blockType: 'CLASS' },
    orderBy: [
      { dayOfWeek: 'asc' },
      { startTime: 'asc' }
    ]
  });
  
  console.log('='.repeat(80));
  console.log(`${level} TIME BLOCKS (${blocks.length} blocks)`);
  console.log('='.repeat(80));
  
  const days = ['', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  let currentDay = 0;
  
  blocks.forEach(block => {
    if (block.dayOfWeek !== currentDay) {
      currentDay = block.dayOfWeek;
      console.log(`\n${days[currentDay]}:`);
    }
    console.log(`  ${block.startTime}-${block.endTime} (${block.duration} min)`);
  });
  
  console.log('\n');
}

// Show breaks and lunches
console.log('='.repeat(80));
console.log('BREAKS AND LUNCHES');
console.log('='.repeat(80));

const breaks = await p.timeBlock.findMany({
  where: { blockType: { in: ['BREAK', 'LUNCH'] } },
  orderBy: [
    { level: 'asc' },
    { dayOfWeek: 'asc' },
    { startTime: 'asc' }
  ]
});

const days = ['', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

breaks.forEach(block => {
  console.log(`${block.level.padEnd(15)} | ${days[block.dayOfWeek].padEnd(10)} | ${block.startTime}-${block.endTime} | ${block.blockType}`);
});

await p.$disconnect();
