import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const blocks = await prisma.timeBlock.groupBy({ by: ["blockType"], _count: true });
console.log("Block types:", blocks);

// Also find all time blocks on Friday between 11:00-13:00
const friday = await prisma.timeBlock.findMany({
  where: { dayOfWeek: 5, startTime: { gte: "11:00", lte: "13:00" } },
  orderBy: { startTime: "asc" },
});
console.log("\nFriday blocks 11:00-13:00:");
for (const b of friday) {
  console.log(`  ${b.startTime}-${b.endTime} [${b.blockType}] level=${b.level}`);
}

await prisma.$disconnect();
