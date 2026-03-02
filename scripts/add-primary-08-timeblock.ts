import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DAYS = [1, 2, 3, 4, 5];

async function main() {
  // PRIMARY 08:00-09:00 block needed for Deyanira and other K/1 teachers
  for (const day of DAYS) {
    const existing = await prisma.timeBlock.findFirst({
      where: { dayOfWeek: day, startTime: "08:00", level: "PRIMARY" },
    });
    if (existing) { console.log(`Already exists: PRIMARY day=${day} 08:00`); continue; }
    await prisma.timeBlock.create({
      data: { dayOfWeek: day, startTime: "08:00", endTime: "09:00", duration: "60", blockType: "CLASS", level: "PRIMARY" } as any,
    });
    console.log(`Created: PRIMARY day=${day} 08:00 - 09:00`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
