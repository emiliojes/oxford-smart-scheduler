import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const wrongPatterns = [
  { startTime: "09:15", endTime: "10:15" },
  { startTime: "10:15", endTime: "11:15" },
  { startTime: "11:15", endTime: "12:00" },
  { startTime: "12:30", endTime: "13:15" },
  { startTime: "12:30", endTime: "13:30" },
];

const wrongBlocks = await p.timeBlock.findMany({
  where: {
    level: "SECONDARY",
    OR: wrongPatterns.map(b => ({ startTime: b.startTime, endTime: b.endTime }))
  }
});

console.log(`Found ${wrongBlocks.length} wrong SECONDARY blocks → changing to PRIMARY\n`);

const ids = wrongBlocks.map(b => b.id);
const updated = await p.timeBlock.updateMany({
  where: { id: { in: ids } },
  data: { level: "PRIMARY" }
});
console.log(`✅ Re-leveled ${updated.count} blocks: SECONDARY → PRIMARY`);

// Verify SECONDARY blocks remaining
const remaining = await p.timeBlock.findMany({
  where: { level: "SECONDARY" },
  orderBy: { startTime: "asc" }
});
const patterns = new Map();
for (const b of remaining) {
  const key = `${b.startTime}-${b.endTime}-${b.blockType}`;
  if (!patterns.has(key)) patterns.set(key, { startTime: b.startTime, endTime: b.endTime, blockType: b.blockType, days: [] });
  patterns.get(key).days.push(b.dayOfWeek);
}
console.log("\nSECONDARY blocks now (should match paper exactly):");
for (const pt of [...patterns.values()].sort((a,b) => a.startTime.localeCompare(b.startTime))) {
  console.log(`  ${pt.startTime} – ${pt.endTime}  [${pt.blockType.padEnd(12)}]  days: ${pt.days.sort().join(",")}`);
}

await p.$disconnect();
