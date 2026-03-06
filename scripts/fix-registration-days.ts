import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Remove Homeroom assignments from 07:15-07:30 Registration slots for Tue-Fri (days 2-5)
  // for PRIMARY teachers — Registration is automatic, not a class assignment

  const homeroomSubject = await prisma.subject.findFirst({ where: { name: 'Homeroom' } });
  if (!homeroomSubject) { console.error('Homeroom subject not found'); return; }

  // Find 07:15-07:30 REGISTRATION blocks for days 2-5
  const regBlocks = await prisma.timeBlock.findMany({
    where: { dayOfWeek: { in: [2, 3, 4, 5] }, startTime: '07:15', blockType: 'REGISTRATION' },
  });
  console.log(`Registration blocks Tue-Fri: ${regBlocks.length}`);

  const regBlockIds = regBlocks.map(b => b.id);

  // Find and delete Homeroom assignments on those blocks for PRIMARY teachers
  const toDelete = await prisma.assignment.findMany({
    where: {
      subjectId: homeroomSubject.id,
      timeBlockId: { in: regBlockIds },
      teacher: { level: 'PRIMARY' },
    },
    include: { teacher: true, timeBlock: true },
  });

  console.log(`Homeroom assignments on Tue-Fri 07:15 to delete: ${toDelete.length}`);
  toDelete.forEach(a => console.log(`  Day${a.timeBlock.dayOfWeek} | ${a.teacher.name}`));

  for (const a of toDelete) {
    await prisma.assignment.delete({ where: { id: a.id } });
  }

  // Also remove Monday 07:15 Homeroom — Registration row shows automatically
  const monRegBlocks = await prisma.timeBlock.findMany({
    where: { dayOfWeek: 1, startTime: '07:15', blockType: 'REGISTRATION' },
  });
  const monRegIds = monRegBlocks.map(b => b.id);

  const monHomeroom = await prisma.assignment.findMany({
    where: {
      subjectId: homeroomSubject.id,
      timeBlockId: { in: monRegIds },
      teacher: { level: 'PRIMARY' },
    },
    include: { teacher: true },
  });

  console.log(`\nMonday 07:15 Homeroom assignments to delete: ${monHomeroom.length}`);
  for (const a of monHomeroom) {
    await prisma.assignment.delete({ where: { id: a.id } });
    console.log(`  Deleted: ${a.teacher.name}`);
  }

  console.log('\nDone.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
