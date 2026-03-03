import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DAYS = [1, 2, 3, 4, 5];

const slots = [
  { startTime: "07:30", endTime: "08:15", duration: "45", blockType: "CLASS" },  // Manuel 7:30-8:15 row
  { startTime: "08:15", endTime: "09:00", duration: "45", blockType: "CLASS" },  // Manuel 8:15-9:00 row
  { startTime: "09:30", endTime: "09:45", duration: "15", blockType: "BREAK" },  // Manuel 9:30-9:45 BREAK row
];

async function main() {
  for (const slot of slots) {
    for (const level of ["PRIMARY"]) {
      for (const day of DAYS) {
        const existing = await prisma.timeBlock.findFirst({
          where: { dayOfWeek: day, startTime: slot.startTime, level },
        });
        if (existing) {
          console.log(`Already exists: ${level} day=${day} ${slot.startTime}`);
          continue;
        }
        await prisma.timeBlock.create({
          data: { dayOfWeek: day, startTime: slot.startTime, endTime: slot.endTime, duration: slot.duration, blockType: slot.blockType, level } as any,
        });
        console.log(`Created: ${level} day=${day} ${slot.startTime} - ${slot.endTime}`);
      }
    }
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
