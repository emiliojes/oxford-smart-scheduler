import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Wrong SECONDARY blocks (not in the official paper schedule)
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
    OR: wrongPatterns.map(p => ({ startTime: p.startTime, endTime: p.endTime }))
  }
});

console.log(`Found ${wrongBlocks.length} wrong SECONDARY blocks\n`);

// Check for assignments on these blocks
let totalAssignments = 0;
for (const b of wrongBlocks) {
  const asgns = await p.assignment.findMany({
    where: { timeBlockId: b.id },
    include: { subject: true, grade: true, teacher: true }
  });
  if (asgns.length > 0) {
    console.log(`⚠️  Block ${b.startTime}–${b.endTime} day${b.dayOfWeek} has ${asgns.length} assignments:`);
    asgns.forEach(a => console.log(`     ${a.grade?.name ?? "?"}${a.grade?.section ?? ""} | ${a.subject.name} | ${a.teacher.name}`));
    totalAssignments += asgns.length;
  }
}

if (totalAssignments > 0) {
  console.log(`\n❌ Cannot safely delete — ${totalAssignments} assignments on wrong blocks. Review above first.`);
  await p.$disconnect();
  process.exit(1);
}

// Safe to delete — no assignments on these blocks
const ids = wrongBlocks.map(b => b.id);
const deleted = await p.timeBlock.deleteMany({ where: { id: { in: ids } } });
console.log(`✅ Deleted ${deleted.count} wrong SECONDARY blocks`);

// Verify what's left
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
console.log("\nRemaining SECONDARY blocks:");
for (const p of [...patterns.values()].sort((a,b) => a.startTime.localeCompare(b.startTime))) {
  console.log(`  ${p.startTime} – ${p.endTime}  [${p.blockType.padEnd(12)}]  days: ${p.days.sort().join(",")}`);
}

await p.$disconnect();
