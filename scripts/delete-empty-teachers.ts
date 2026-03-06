import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const toDelete = await prisma.teacher.findMany({
    where: { assignments: { none: {} } },
    orderBy: { name: 'asc' },
  });

  console.log(`Teachers con 0 assignments: ${toDelete.length}`);
  for (const t of toDelete) {
    await prisma.teacher.delete({ where: { id: t.id } });
    console.log(`  DELETED: ${t.name}`);
  }
  console.log('\nListo.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
