import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Missing PRIMARY time blocks needed for teachers like Manuel Abrego
// who have classes at non-standard times embedded in Excel cells
const DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

// These are SECONDARY-aligned slots that PRIMARY teachers (like Omely) also use
// when teaching grade 6 classes that share the SECONDARY timetable.
const missingSlots = [
  { startTime: "09:45", endTime: "10:45", duration: "60", blockType: "CLASS" },
  { startTime: "10:45", endTime: "11:45", duration: "60", blockType: "CLASS" },
  { startTime: "11:45", endTime: "12:45", duration: "60", blockType: "CLASS" },
  { startTime: "12:45", endTime: "13:15", duration: "30", blockType: "LUNCH" },
  { startTime: "13:15", endTime: "14:15", duration: "60", blockType: "CLASS" },
  { startTime: "14:15", endTime: "15:15", duration: "60", blockType: "CLASS" },
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
