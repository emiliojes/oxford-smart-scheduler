import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const subjects = [
    "Lunch Duty - GYM",
    "Lunch Duty - Cafeteria",
    "Lunch Duty - Synthetic Field",
    "Lunch Duty - School Bus Area",
    "Lunch Duty - Parking Lot",
  ];
  for (const name of subjects) {
    const existing = await prisma.subject.findFirst({ where: { name } });
    if (existing) {
      console.log(`Already exists: ${name}`);
    } else {
      const s = await prisma.subject.create({
        data: { name, level: "BOTH", weeklyFrequency: 1, defaultDuration: "30" },
      });
      console.log(`Created: ${name} (${s.id})`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
