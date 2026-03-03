import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const arrollo = await prisma.teacher.findFirst({ where: { name: { contains: "Arrollo" } } });
  const arroyo  = await prisma.teacher.findFirst({ where: { name: { contains: "Arroyo" } } });
  console.log("Arrollo:", arrollo?.id, arrollo?.name);
  console.log("Arroyo: ", arroyo?.id, arroyo?.name);
  if (!arrollo || !arroyo) { console.log("Not found"); return; }

  const count = await prisma.assignment.count({ where: { teacherId: arrollo.id } });
  console.log(`Assignments on Arrollo: ${count}`);

  if (count > 0) {
    await prisma.assignment.updateMany({ where: { teacherId: arrollo.id }, data: { teacherId: arroyo.id } });
    console.log(`Moved ${count} assignments to Arroyo`);
  }
  await prisma.teacher.delete({ where: { id: arrollo.id } });
  console.log("Deleted Arrollo duplicate");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
