import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const teachers = await prisma.teacher.findMany({ orderBy: { name: "asc" } });
  const noEmail = teachers.filter(t => !t.email);
  console.log(`\nTotal teachers: ${teachers.length}`);
  console.log(`Without email: ${noEmail.length}\n`);
  noEmail.forEach((t, i) => console.log(`${i + 1}. ${t.name.padEnd(30)} [${t.level}]`));
  await prisma.$disconnect();
}
main();
