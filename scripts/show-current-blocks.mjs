import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const blocks = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, level: { in: ["SECONDARY","BOTH"] } },
  orderBy: { startTime: "asc" },
});
console.log("Day 1 SECONDARY blocks:");
blocks.forEach(b => console.log(`  ${b.blockType.padEnd(12)} ${b.startTime} - ${b.endTime}  (${b.level})`));
await p.$disconnect();
