import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find all Science/Biology subjects for SECONDARY level
  const subjects = await prisma.subject.findMany({
    where: { name: { in: ['Science', 'Biology'] }, level: 'SECONDARY' },
    include: { _count: { select: { assignments: true } } }
  });
  console.log("Found subjects:", JSON.stringify(subjects, null, 2));

  const sciences  = subjects.filter(s => s.name === 'Science');
  const biologies = subjects.filter(s => s.name === 'Biology');

  console.log(`\nScience (SECONDARY): ${sciences.length}`);
  console.log(`Biology (SECONDARY): ${biologies.length}`);

  // If there's still a Science, rename it to Biology
  for (const s of sciences) {
    console.log(`\nRenaming Science (id=${s.id}, assignments=${s._count.assignments}) → Biology`);
    await prisma.subject.update({ where: { id: s.id }, data: { name: 'Biology' } });
  }

  // If there are now duplicate Biology subjects, merge assignments to one and delete the empty
  const allBio = await prisma.subject.findMany({
    where: { name: 'Biology', level: 'SECONDARY' },
    include: { _count: { select: { assignments: true } } }
  });

  if (allBio.length > 1) {
    console.log("\nDuplicate Biology found — merging...");
    const keeper  = allBio.reduce((a, b) => a._count.assignments >= b._count.assignments ? a : b);
    const toDelete = allBio.filter(b => b.id !== keeper.id);
    for (const dup of toDelete) {
      if (dup._count.assignments > 0) {
        console.log(`  Reassigning ${dup._count.assignments} assignments from ${dup.id} → ${keeper.id}`);
        await prisma.assignment.updateMany({ where: { subjectId: dup.id }, data: { subjectId: keeper.id } });
      }
      console.log(`  Deleting duplicate Biology id=${dup.id}`);
      await prisma.subject.delete({ where: { id: dup.id } });
    }
  }

  console.log("\nDone. Final Biology (SECONDARY) subjects:");
  const final = await prisma.subject.findMany({ where: { name: 'Biology', level: 'SECONDARY' } });
  console.log(JSON.stringify(final, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
