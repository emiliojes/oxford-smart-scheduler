import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const blocks = await p.timeBlock.findMany({
  where: { blockType: { in: ["LUNCH","BREAK","REGISTRATION","DISMISSAL"] }, dayOfWeek: 1 },
  orderBy: { startTime: "asc" },
});
console.log("Special blocks day 1:");
for (const b of blocks) console.log(`  ${b.blockType.padEnd(12)} | ${b.startTime} - ${b.endTime} | ${b.level}`);
await p.$disconnect();
