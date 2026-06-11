import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log("All CLASS blocks with startTime >= 13:00, day 1:");
const blocks = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, blockType: "CLASS", startTime: { gte: "13:00" } },
  orderBy: { startTime: "asc" },
});
for (const b of blocks) console.log(`  ${b.startTime}-${b.endTime} level=${b.level} id=${b.id}`);

await p.$disconnect();
