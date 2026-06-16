import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const blocks = await p.timeBlock.findMany({
  where: { dayOfWeek: 1 },
  orderBy: [{ level: "asc" }, { startTime: "asc" }],
});

const grouped = {};
for (const b of blocks) {
  if (!grouped[b.level]) grouped[b.level] = [];
  const key = `${b.startTime}-${b.endTime}  ${b.blockType}`;
  if (!grouped[b.level].find(x => x === key)) grouped[b.level].push(key);
}

for (const [level, rows] of Object.entries(grouped)) {
  console.log(`\n=== ${level} ===`);
  rows.forEach(r => console.log(" ", r));
}

await p.$disconnect();
