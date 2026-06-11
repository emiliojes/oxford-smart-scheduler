import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const tbs = await p.timeBlock.findMany({
  where: { level: "SECONDARY", blockType: "CLASS" },
  orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
});

console.log("SECONDARY CLASS TimeBlocks all days:");
for (const b of tbs) {
  console.log(`  day${b.dayOfWeek} ${b.startTime} | ${b.id}`);
}
await p.$disconnect();
