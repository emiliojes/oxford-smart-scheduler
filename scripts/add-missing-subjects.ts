import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const toCreate = [
    { name: "Social Studies", level: "BOTH" },
    { name: "Social Science", level: "SECONDARY" },
    { name: "Literature", level: "SECONDARY" },
    { name: "Biology", level: "SECONDARY" },
    { name: "Arrival Duty", level: "BOTH" },
    { name: "Lunch Duty - School Bus Area", level: "BOTH" },
    { name: "Lunch Duty - Parking Lot", level: "BOTH" },
    { name: "Dismissal Duty - Parking Lot", level: "BOTH" },
    { name: "Dismissal Duty - Colegial", level: "BOTH" },
    { name: "Dismissal Duty - School Bus Area", level: "BOTH" },
    { name: "Math 6", level: "SECONDARY" },
    { name: "Math 7", level: "SECONDARY" },
    { name: "Arrival Duty - School Bus Area", level: "BOTH" },
    { name: "Arrival Duty - Parking Lot", level: "BOTH" },
  ];
  for (const s of toCreate) {
    const existing = await prisma.subject.findFirst({ where: { name: s.name } });
    if (existing) { console.log(`Already exists: ${s.name}`); continue; }
    const created = await prisma.subject.create({ data: { name: s.name, level: s.level as any, weeklyFrequency: 5, defaultDuration: "60" } });
    console.log(`Created: ${created.name}`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
