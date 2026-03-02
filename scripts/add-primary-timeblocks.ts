import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Missing PRIMARY time blocks needed for teachers like Manuel Abrego
// who have classes at non-standard times embedded in Excel cells
const DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

const missingSlots = [
  { startTime: "08:00", endTime: "09:00", duration: "60", blockType: "CLASS" },
  { startTime: "08:15", endTime: "09:15", duration: "60", blockType: "CLASS" },
  { startTime: "10:00", endTime: "11:00", duration: "60", blockType: "CLASS" },
  { startTime: "10:30", endTime: "11:30", duration: "60", blockType: "CLASS" },
  { startTime: "11:00", endTime: "12:00", duration: "60", blockType: "CLASS" },
];

async function main() {
  for (const slot of missingSlots) {
    for (const day of DAYS) {
      const existing = await prisma.timeBlock.findFirst({
        where: { dayOfWeek: day, startTime: slot.startTime, level: "PRIMARY" },
      });
      if (existing) {
        console.log(`Already exists: PRIMARY day=${day} ${slot.startTime}`);
        continue;
      }
      const created = await prisma.timeBlock.create({
        data: {
          dayOfWeek: day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
          blockType: slot.blockType,
          level: "PRIMARY",
        } as any,
      });
      console.log(`Created: PRIMARY day=${day} ${slot.startTime} - ${slot.endTime}`);
    }
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
