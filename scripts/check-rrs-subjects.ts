import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const names = [
    "SCIENCE ENGLISH LEO", "SCIENCE ENGLISH VIELKA",
    "CONRADO SCIENCE SPANISH AVIDEL", "SPANISH ARACELLYS SOC. MADELAINE", "SOC. MADELAINE"
  ];
  for (const name of names) {
    const r = await prisma.subject.findFirst({ where: { name } });
    console.log(r ? `EXISTS: ${name}` : `MISSING: ${name}`);
  }
  await prisma.$disconnect();
}
main();
