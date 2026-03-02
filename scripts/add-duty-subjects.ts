import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const subjects = [
    { name: "Lunch Duty", level: "BOTH", weeklyFrequency: 5, defaultDuration: "30" },
    { name: "Dismissal Duty", level: "BOTH", weeklyFrequency: 1, defaultDuration: "15" },
  ];
  for (const s of subjects) {
    const existing = await prisma.subject.findFirst({ where: { name: s.name } });
    if (existing) {
      console.log(`Already exists: ${s.name} (${existing.id})`);
    } else {
      const created = await prisma.subject.create({ data: s });
      console.log(`Created: ${s.name} (${created.id})`);
    }
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
