import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const blocks = await p.timeBlock.findMany({
  where: { level: "LOW_SECONDARY", dayOfWeek: 1 },
  orderBy: { startTime: "asc" },
});
console.log("LOW_SECONDARY timeblocks (Monday):\n");
const seen = new Set();
for (const b of blocks) {
  const k = `${b.startTime}-${b.endTime}  ${b.blockType}`;
  if (!seen.has(k)) { seen.add(k); console.log(" ", k); }
}
await p.$disconnect();
