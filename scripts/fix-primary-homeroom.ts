import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find or create 07:30-08:00 REGISTRATION block for Monday (day 1) only
  // Homeroom on Monday is 7:30-8:00 (30 min) per the schedule images
  // The other days 7:30 slot keeps the full 07:30-08:30 CLASS block

  // Step 1: Create 07:30-08:00 REGISTRATION block for day 1 only
  const existing = await prisma.timeBlock.findFirst({
    where: { dayOfWeek: 1, startTime: '07:30', endTime: '08:00' },
  });

  let mondayHomeroom30: string;
  if (existing) {
    mondayHomeroom30 = existing.id;
    console.log(`07:30-08:00 block already exists: ${existing.id}`);
  } else {
    const created = await prisma.timeBlock.create({
      data: { dayOfWeek: 1, startTime: '07:30', endTime: '08:00', blockType: 'REGISTRATION', duration: '30', level: 'PRIMARY' },
    });
    mondayHomeroom30 = created.id;
    console.log(`Created 07:30-08:00 REGISTRATION block for Monday: ${created.id}`);
  }

  // Step 2: Find all Monday Homeroom assignments currently on 07:30-08:30 for PRIMARY teachers
  const homeroomSubject = await prisma.subject.findFirst({ where: { name: 'Homeroom' } });
  if (!homeroomSubject) { console.error('Homeroom subject not found'); return; }

  // Find Monday 07:30-08:30 CLASS blocks (day 1)
  const monday7h30blocks = await prisma.timeBlock.findMany({
    where: { dayOfWeek: 1, startTime: '07:30', blockType: 'CLASS' },
  });
  console.log(`Monday 07:30 CLASS blocks: ${monday7h30blocks.map(b => b.endTime).join(', ')}`);

  const blockIds = monday7h30blocks.map(b => b.id);

  const homeroomAssignments = await prisma.assignment.findMany({
    where: {
      subjectId: homeroomSubject.id,
      timeBlockId: { in: blockIds },
      teacher: { level: 'PRIMARY' },
    },
    include: { teacher: true, grade: true, timeBlock: true },
  });

  console.log(`\nHomeroom assignments on Monday 07:30-08:30 to fix: ${homeroomAssignments.length}`);
  homeroomAssignments.forEach(a => {
    console.log(`  ${a.teacher.name} | Grade ${a.grade?.name}${a.grade?.section} | ${a.timeBlock.startTime}-${a.timeBlock.endTime}`);
  });

  // Step 3: Move them to the 07:30-08:00 block
  for (const a of homeroomAssignments) {
    await prisma.assignment.update({
      where: { id: a.id },
      data: { timeBlockId: mondayHomeroom30, note: null },
    });
  }

  console.log(`\nMoved ${homeroomAssignments.length} Homeroom assignments to 07:30-08:00`);
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
