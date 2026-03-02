import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Create Homeroom subject for BOTH levels
  const existing = await prisma.subject.findFirst({ where: { name: "Homeroom" } });
  if (existing) {
    console.log("Homeroom subject already exists:", existing.id);
  } else {
    const s = await prisma.subject.create({
      data: {
        name: "Homeroom",
        level: "BOTH",
        weeklyFrequency: 5,
        defaultDuration: "60",
      },
    });
    console.log("Created Homeroom subject:", s.id);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
