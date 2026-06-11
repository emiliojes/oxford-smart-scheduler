import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const blocks = await p.timeBlock.findMany({
  where: { level: "SECONDARY", dayOfWeek: 1 },
  orderBy: [{ startTime: "asc" }],
});
console.log("SECONDARY Monday time blocks:");
for (const b of blocks) {
  console.log(`  ${b.startTime} - ${b.endTime ?? "??"}  [${b.blockType}]  dur=${b.duration ?? "?"}`);
}

await p.$disconnect();
