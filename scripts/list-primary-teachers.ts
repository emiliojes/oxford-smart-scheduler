import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teachers = await prisma.teacher.findMany({
    where: { level: 'PRIMARY' },
    include: { _count: { select: { assignments: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`Total teachers PRIMARY: ${teachers.length}\n`);
  teachers.forEach(t => {
    console.log(`  ${t.name} | assignments: ${t._count.assignments} | id: ${t.id}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
