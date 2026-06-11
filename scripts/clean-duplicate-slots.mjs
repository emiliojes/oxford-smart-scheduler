import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Remove zero-duration 11:45-11:45 blocks (no assignments should be on them)
const bad = await p.timeBlock.findMany({
  where: { startTime: "11:45", endTime: "11:45" },
});
console.log(`Found ${bad.length} zero-duration 11:45 blocks`);
for (const b of bad) {
  const cnt = await p.assignment.count({ where: { timeBlockId: b.id } });
  if (cnt === 0) {
    await p.timeBlock.delete({ where: { id: b.id } });
    console.log(`  Deleted Day${b.dayOfWeek} 11:45-11:45 (no assignments)`);
  } else {
    console.log(`  SKIPPED Day${b.dayOfWeek} 11:45-11:45 — has ${cnt} assignments!`);
  }
}

// Also remove duplicate 11:45-12:45 blocks (keep only one per day)
const good = await p.timeBlock.findMany({
  where: { startTime: "11:45", endTime: "12:45", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`\n11:45-12:45 blocks: ${good.length}`);
const seen = new Set();
for (const b of good) {
  if (seen.has(b.dayOfWeek)) {
    const cnt = await p.assignment.count({ where: { timeBlockId: b.id } });
    if (cnt === 0) {
      await p.timeBlock.delete({ where: { id: b.id } });
      console.log(`  Removed duplicate Day${b.dayOfWeek} 11:45-12:45`);
    } else {
      console.log(`  KEPT duplicate Day${b.dayOfWeek} (has ${cnt} assignments)`);
    }
  } else {
    seen.add(b.dayOfWeek);
    console.log(`  Kept Day${b.dayOfWeek} 11:45-12:45`);
  }
}

await p.$disconnect();
console.log("\nDone!");
