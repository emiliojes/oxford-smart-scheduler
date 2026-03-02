import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const grades = await prisma.grade.findMany({
    select: { name: true, section: true, level: true },
    orderBy: [{ name: "asc" }, { section: "asc" }],
  });
  grades.forEach(g => console.log(`Grade ${g.name}${g.section} -> level: ${g.level}`));
  await prisma.$disconnect();
}
main().catch(console.error);
