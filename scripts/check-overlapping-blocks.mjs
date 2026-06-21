import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 CHECKING OVERLAPPING TIME BLOCKS\n');

const days = ['', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

// Get all class blocks
const blocks = await p.timeBlock.findMany({
  where: { blockType: 'CLASS' },
  orderBy: [
    { level: 'asc' },
    { dayOfWeek: 'asc' },
    { startTime: 'asc' }
  ]
});

// Function to convert time to minutes
function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check for overlaps
const overlaps = [];

for (let i = 0; i < blocks.length; i++) {
  for (let j = i + 1; j < blocks.length; j++) {
    const b1 = blocks[i];
    const b2 = blocks[j];
    
    // Only check same day and level
    if (b1.dayOfWeek !== b2.dayOfWeek || b1.level !== b2.level) continue;
    
    const start1 = timeToMinutes(b1.startTime);
    const end1 = timeToMinutes(b1.endTime);
    const start2 = timeToMinutes(b2.startTime);
    const end2 = timeToMinutes(b2.endTime);
    
    // Check if they overlap
    if (start1 < end2 && start2 < end1) {
      overlaps.push({
        level: b1.level,
        day: days[b1.dayOfWeek],
        block1: `${b1.startTime}-${b1.endTime}`,
        block2: `${b2.startTime}-${b2.endTime}`,
        id1: b1.id,
        id2: b2.id
      });
    }
  }
}

console.log(`Found ${overlaps.length} overlapping blocks:\n`);

overlaps.forEach((overlap, index) => {
  console.log(`${index + 1}. ${overlap.level} - ${overlap.day}`);
  console.log(`   Block 1: ${overlap.block1} (${overlap.id1.substring(0, 8)})`);
  console.log(`   Block 2: ${overlap.block2} (${overlap.id2.substring(0, 8)})`);
  console.log('');
});

// Check for invalid blocks (start = end)
console.log('\n' + '='.repeat(80));
console.log('INVALID BLOCKS (startTime = endTime)');
console.log('='.repeat(80) + '\n');

const invalidBlocks = blocks.filter(b => b.startTime === b.endTime);

console.log(`Found ${invalidBlocks.length} invalid blocks:\n`);

invalidBlocks.forEach((block, index) => {
  console.log(`${index + 1}. ${block.level} - ${days[block.dayOfWeek]} - ${block.startTime}-${block.endTime} (${block.id.substring(0, 8)})`);
});

// Check specific problematic blocks
console.log('\n' + '='.repeat(80));
console.log('SPECIFIC PROBLEM: 14:00-15:15 vs 14:15-15:15');
console.log('='.repeat(80) + '\n');

const problem1 = await p.timeBlock.findMany({
  where: {
    startTime: '14:00',
    endTime: '15:15',
    blockType: 'CLASS'
  }
});

const problem2 = await p.timeBlock.findMany({
  where: {
    startTime: '14:15',
    endTime: '15:15',
    blockType: 'CLASS'
  }
});

console.log('Blocks 14:00-15:15:');
problem1.forEach(b => {
  console.log(`  ${b.level} - ${days[b.dayOfWeek]} - Duration: ${b.duration} - ID: ${b.id.substring(0, 8)}`);
});

console.log('\nBlocks 14:15-15:15:');
problem2.forEach(b => {
  console.log(`  ${b.level} - ${days[b.dayOfWeek]} - Duration: ${b.duration} - ID: ${b.id.substring(0, 8)}`);
});

// Check if any assignments use these blocks
console.log('\n' + '='.repeat(80));
console.log('ASSIGNMENTS USING THESE BLOCKS');
console.log('='.repeat(80) + '\n');

for (const block of [...problem1, ...problem2]) {
  const assignments = await p.assignment.findMany({
    where: { timeBlockId: block.id },
    include: {
      teacher: true,
      grade: true,
      subject: true
    }
  });
  
  if (assignments.length > 0) {
    console.log(`Block ${block.startTime}-${block.endTime} (${block.level} - ${days[block.dayOfWeek]}):`);
    assignments.forEach(a => {
      console.log(`  - ${a.teacher.name} teaching ${a.subject.name} to ${a.grade.name}${a.grade.section || ''}`);
    });
    console.log('');
  }
}

await p.$disconnect();
