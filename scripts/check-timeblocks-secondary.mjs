import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const blocks = await p.timeBlock.findMany({
  where: { level: { in: ["SECONDARY", "BOTH"] }, dayOfWeek: 1 },
  orderBy: { startTime: "asc" },
});

console.log("SECONDARY/BOTH timeblocks (Monday only):\n");
const seen = new Set();
for (const b of blocks) {
  const k = `${b.startTime}-${b.endTime}  ${b.blockType.padEnd(12)}  level:${b.level}`;
  if (!seen.has(k)) { seen.add(k); console.log(" ", k); }
}

await p.$disconnect();
