/**
 * High School post-lunch slots:
 *   OLD: 13:30-14:30, 14:30-15:30, DISMISSAL 15:30-15:45
 *   NEW: 13:30-14:15, 14:15-15:00, DISMISSAL 15:00-15:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Fix 13:30-14:30 → 13:30-14:15
const slot6 = await p.timeBlock.findMany({
  where: { startTime: "13:30", endTime: "14:30", blockType: "CLASS" },
});
console.log(`Slot6 blocks (13:30-14:30): ${slot6.length}`);
for (const b of slot6) {
  await p.timeBlock.update({ where: { id: b.id }, data: { endTime: "14:15", duration: "45" } });
}

// 2. Fix 14:30-15:30 → 14:15-15:00 (startTime changes, need new blocks + migrate assignments)
const slot7old = await p.timeBlock.findMany({
  where: { startTime: "14:30", endTime: "15:30", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Slot7 blocks (14:30-15:30): ${slot7old.length}`);

for (const oldTB of slot7old) {
  // Create new block 14:15-15:00
  const newTB = await p.timeBlock.create({
    data: {
      dayOfWeek: oldTB.dayOfWeek,
      startTime: "14:15",
      endTime:   "15:00",
      duration:  "45",
      blockType: "CLASS",
      level:     oldTB.level,
    },
  });
  // Migrate ALL assignments from old block to new block
  const asgns = await p.assignment.findMany({ where: { timeBlockId: oldTB.id } });
  for (const a of asgns) {
    await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  }
  console.log(`  Day${oldTB.dayOfWeek}: created 14:15-15:00, migrated ${asgns.length} assignments`);
  // Delete old block (no more assignments)
  await p.timeBlock.delete({ where: { id: oldTB.id } });
}

// 3. Fix DISMISSAL 15:30-15:45 → 15:00-15:15
const dismissal = await p.timeBlock.findMany({
  where: { startTime: "15:30", blockType: "DISMISSAL" },
});
console.log(`Dismissal blocks (15:30): ${dismissal.length}`);
for (const b of dismissal) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "15:00", endTime: "15:15", duration: "15" } });
}

// Also fix any leftover 15:30 CLASS blocks (High slot7 old duplicates)
const leftover = await p.timeBlock.findMany({ where: { startTime: "15:30", blockType: "CLASS" } });
console.log(`Leftover 15:30 CLASS blocks: ${leftover.length}`);
for (const b of leftover) {
  const cnt = await p.assignment.count({ where: { timeBlockId: b.id } });
  if (cnt === 0) await p.timeBlock.delete({ where: { id: b.id } });
}

// Verify
console.log("\nHigh CLASS blocks day 1 after fix:");
const verify = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, level: "SECONDARY", blockType: { in: ["CLASS","DISMISSAL"] } },
  orderBy: { startTime: "asc" },
});
for (const b of verify) console.log(`  ${b.blockType} ${b.startTime} - ${b.endTime}`);

await p.$disconnect();
console.log("\nDone!");
