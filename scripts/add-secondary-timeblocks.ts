import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const DAYS = [1, 2, 3, 4, 5];

// Missing SECONDARY (and PRIMARY mirror) slots for arrival/dismissal duties
const slots = [
  { startTime: "15:15", endTime: "15:30", duration: "15", blockType: "CLASS" },
];

async function main() {
  for (const slot of slots) {
    for (const level of ["PRIMARY", "SECONDARY"]) {
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
