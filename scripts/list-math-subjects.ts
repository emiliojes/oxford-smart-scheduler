import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const subjects = await prisma.subject.findMany({ where: { name: { contains: "Math" } }, orderBy: { name: "asc" } });
  subjects.forEach(s => console.log(`${s.id}  ${s.name}  level=${s.level}`));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
