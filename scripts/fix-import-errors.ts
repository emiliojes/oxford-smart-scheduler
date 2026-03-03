import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DAYS = [1, 2, 3, 4, 5];

async function main() {
  // 1. Add PRIMARY 13:00 time block (Music K slot 1:00-1:50)
  for (const day of DAYS) {
    const existing = await prisma.timeBlock.findFirst({ where: { dayOfWeek: day, startTime: "13:00", level: "PRIMARY" } });
    if (existing) { console.log(`Already exists: PRIMARY day=${day} 13:00`); continue; }
    await prisma.timeBlock.create({
      data: { dayOfWeek: day, startTime: "13:00", endTime: "13:50", duration: "50", blockType: "CLASS", level: "PRIMARY" } as any,
    });
    console.log(`Created: PRIMARY day=${day} 13:00 - 13:50`);
  }

  // 2. Create grade PK (Pre-Kinder) with empty section if it doesn't exist
  const pk = await prisma.grade.findFirst({ where: { name: "PK" } });
  if (!pk) {
    await prisma.grade.create({ data: { name: "PK", section: "", level: "PRIMARY", studentCount: 20, subjectCount: 0 } as any });
    console.log("Created grade PK");
  } else {
    console.log("Grade PK already exists:", pk.id, pk.name, pk.section);
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
