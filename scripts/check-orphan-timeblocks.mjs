import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check the suspicious timeblocks: 12:00-13:00 and 13:00-14:00 and 14:00-15:15
const suspicious = ["12:00", "13:00", "14:00"];

for (const st of suspicious) {
  const blocks = await p.timeBlock.findMany({
    where: { startTime: st, level: { in: ["SECONDARY", "BOTH"] } },
  });
  for (const b of blocks) {
    const count = await p.assignment.count({ where: { timeBlockId: b.id } });
    console.log(`${b.startTime}-${b.endTime} ${b.blockType} [${b.level}] id:${b.id} → ${count} assignments`);
  }
}

// Also check 10:45 duplicates
const blocks1045 = await p.timeBlock.findMany({
  where: { startTime: "10:45", level: { in: ["SECONDARY", "BOTH"] } },
});
console.log("\n10:45 blocks:");
for (const b of blocks1045) {
  const count = await p.assignment.count({ where: { timeBlockId: b.id } });
  console.log(`  ${b.startTime}-${b.endTime} ${b.blockType} [${b.level}] id:${b.id} → ${count} assignments`);
}

await p.$disconnect();
