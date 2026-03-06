import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // On Monday, after Homeroom (07:30-08:00), the next class should start at 08:00
  // Currently those classes are on 08:30-09:30 (wrong), they should be on 08:00-09:00
  // We need to move all PRIMARY Monday 08:30 assignments to 08:00 block

  // Find or create 08:00-09:00 block for Monday
  let block0800 = await prisma.timeBlock.findFirst({
    where: { dayOfWeek: 1, startTime: '08:00', endTime: '09:00', blockType: 'CLASS' },
  });
  if (!block0800) {
    block0800 = await prisma.timeBlock.create({
      data: { dayOfWeek: 1, startTime: '08:00', endTime: '09:00', blockType: 'CLASS', duration: '60', level: 'PRIMARY' },
    });
    console.log(`Created 08:00-09:00 CLASS block for Monday`);
  } else {
    console.log(`08:00-09:00 block already exists`);
  }

  // Find Monday 08:30-09:30 blocks (the wrong ones being used)
  const block0830 = await prisma.timeBlock.findMany({
    where: { dayOfWeek: 1, startTime: '08:30', blockType: 'CLASS' },
  });
  const block0830ids = block0830.map(b => b.id);
  console.log(`Monday 08:30 CLASS blocks found: ${block0830.length}`);

  // Find all PRIMARY teacher assignments on Monday 08:30 that are NOT Homeroom
  const homeroomSubject = await prisma.subject.findFirst({ where: { name: 'Homeroom' } });

  const toMove = await prisma.assignment.findMany({
    where: {
      timeBlockId: { in: block0830ids },
      subjectId: { not: homeroomSubject?.id },
      teacher: { level: 'PRIMARY' },
    },
    include: { teacher: true, subject: true, timeBlock: true },
  });

  console.log(`\nAssignments to move from 08:30 → 08:00: ${toMove.length}`);
  toMove.forEach(a => console.log(`  ${a.teacher.name} | ${a.subject.name} | ${a.timeBlock.startTime}-${a.timeBlock.endTime}`));

  for (const a of toMove) {
    await prisma.assignment.update({
      where: { id: a.id },
      data: { timeBlockId: block0800!.id },
    });
  }

  console.log(`\nMoved ${toMove.length} assignments to 08:00-09:00`);
  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
