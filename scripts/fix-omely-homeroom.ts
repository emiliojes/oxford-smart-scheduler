import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Omely Rujano is LOW_SECONDARY (Grade 6A), her Monday Homeroom was wrongly moved to 07:30-08:00
  // Move it back to the 07:30-08:30 CLASS block

  const omely = await prisma.teacher.findFirst({ where: { name: 'Omely Rujano' } });
  if (!omely) { console.error('Omely not found'); return; }

  const block3000 = await prisma.timeBlock.findFirst({
    where: { dayOfWeek: 1, startTime: '07:30', endTime: '08:00' },
  });
  const block6000 = await prisma.timeBlock.findFirst({
    where: { dayOfWeek: 1, startTime: '07:30', endTime: '08:30', blockType: 'CLASS' },
  });

  if (!block3000 || !block6000) { console.error('Time blocks not found'); return; }

  const updated = await prisma.assignment.updateMany({
    where: { teacherId: omely.id, timeBlockId: block3000.id },
    data: { timeBlockId: block6000.id },
  });

  console.log(`Omely Rujano: moved ${updated.count} assignments back to 07:30-08:30`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
