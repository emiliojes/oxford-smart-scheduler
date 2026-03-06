import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tCinthya = await prisma.teacher.findFirst({ where: { name: 'Cinthya Richards' } });
  const tGinger  = await prisma.teacher.findFirst({ where: { name: 'Ginger Delgado' } });
  const grade2B  = await prisma.grade.findFirst({ where: { name: '2', section: 'B' } });
  const grade5B  = await prisma.grade.findFirst({ where: { name: '5', section: 'B' } });

  if (!tCinthya || !tGinger || !grade2B || !grade5B) {
    console.error('Teacher or grade not found'); return;
  }

  console.log(`Cinthya Richards: Grade 2B → Grade 5B`);
  console.log(`Ginger Delgado:   Grade 5B → Grade 2B`);

  // Cinthya's assignments (currently grade 2B) → reassign to grade 5B
  const cinthyaCount = await prisma.assignment.updateMany({
    where: { teacherId: tCinthya.id, gradeId: grade2B.id },
    data: { gradeId: grade5B.id },
  });

  // Ginger's assignments (currently grade 5B) → reassign to grade 2B
  const gingerCount = await prisma.assignment.updateMany({
    where: { teacherId: tGinger.id, gradeId: grade5B.id },
    data: { gradeId: grade2B.id },
  });

  console.log(`  Cinthya: ${cinthyaCount.count} assignments moved to Grade 5B`);
  console.log(`  Ginger:  ${gingerCount.count} assignments moved to Grade 2B`);
  console.log('\nDone.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
