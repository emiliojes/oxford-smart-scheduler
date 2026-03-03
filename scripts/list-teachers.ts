import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const teachers = await prisma.teacher.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  teachers.forEach(t => console.log(`${t.name}`));
  await prisma.$disconnect();
}
main();
