/**
 * Fix Middle School to final layout:
 *   Slot 5:   11:45 - 12:30 (45 min)  [currently 11:45-12:45]
 *   Lunch:    12:30 - 13:00 (virtual, no change needed)
 *   Clase 6:  13:00 - 14:00 (60 min)  [currently 13:15-14:15]
 *   Clase 7:  14:00 - 15:00 (60 min)  [currently 14:15-15:15]
 *   Departure: 15:00 - 15:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Slot 5: 11:45-12:45 → 11:45-12:30 (Middle blocks only)
// Both Middle and High now share 11:45. Middle assignments are on one set, High on another.
// We need to identify which 11:45-12:45 blocks have MIDDLE assignments.
// Strategy: find all 11:45-12:45 blocks, check their assignments' grades.

const slot5blocks = await p.timeBlock.findMany({
  where: { startTime: "11:45", endTime: "12:45", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`11:45-12:45 blocks: ${slot5blocks.length}`);

for (const b of slot5blocks) {
  const asgns = await p.assignment.findMany({
    where: { timeBlockId: b.id },
    include: { grade: true },
  });
  if (asgns.length === 0) {
    console.log(`  Day${b.dayOfWeek}: no assignments, skip`);
    continue;
  }
  const isMiddle = asgns.every(a => ["6","7","8"].includes(a.grade.name));
  const isHigh   = asgns.every(a => ["9","10","11","12"].includes(a.grade.name));
  if (isMiddle) {
    await p.timeBlock.update({ where: { id: b.id }, data: { endTime: "12:30", duration: "45" } });
    console.log(`  Day${b.dayOfWeek}: Middle block → 11:45-12:30 (${asgns.length} assignments)`);
  } else if (isHigh) {
    console.log(`  Day${b.dayOfWeek}: High block, keep 11:45-12:45 (${asgns.length} assignments)`);
  } else {
    console.log(`  Day${b.dayOfWeek}: MIXED grades — skipping`, asgns.map(a=>a.grade.name).join(","));
  }
}

// 2. Clase 6: 13:15-14:15 → 13:00-14:00 (startTime changes → new blocks + migrate)
const slot6old = await p.timeBlock.findMany({
  where: { startTime: "13:15", endTime: "14:15", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`\nSlot6 (13:15-14:15): ${slot6old.length} blocks`);
for (const oldTB of slot6old) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: oldTB.dayOfWeek, startTime: "13:00", endTime: "14:00", duration: "60", blockType: "CLASS", level: oldTB.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: oldTB.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: oldTB.id } });
  console.log(`  Day${oldTB.dayOfWeek}: 13:15→13:00, migrated ${asgns.length} assignments`);
}

// 3. Clase 7: 14:15-15:15 → 14:00-15:00 (startTime changes → new blocks + migrate)
const slot7old = await p.timeBlock.findMany({
  where: { startTime: "14:15", endTime: "15:15", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`\nSlot7 (14:15-15:15): ${slot7old.length} blocks`);
for (const oldTB of slot7old) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: oldTB.dayOfWeek, startTime: "14:00", endTime: "15:00", duration: "60", blockType: "CLASS", level: oldTB.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: oldTB.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: oldTB.id } });
  console.log(`  Day${oldTB.dayOfWeek}: 14:15→14:00, migrated ${asgns.length} assignments`);
}

// 4. Fix Dismissal for Middle: should be 15:00-15:15
// Current dismissal blocks are at 15:15-15:15, move one set to 15:00-15:15
const dis = await p.timeBlock.findMany({ where: { startTime: "15:15", blockType: "DISMISSAL" } });
console.log(`\nDismissal at 15:15: ${dis.length} blocks`);
// Keep only 5 (one per day), update to 15:00-15:15
const seen = new Set();
for (const b of dis) {
  if (!seen.has(b.dayOfWeek)) {
    await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "15:00", endTime: "15:15", duration: "15" } });
    console.log(`  Day${b.dayOfWeek}: dismissal → 15:00-15:15`);
    seen.add(b.dayOfWeek);
  } else {
    const cnt = await p.assignment.count({ where: { timeBlockId: b.id } });
    if (cnt === 0) { await p.timeBlock.delete({ where: { id: b.id } }); console.log(`  Day${b.dayOfWeek}: removed duplicate`); }
  }
}

// Verify
console.log("\n=== Day 1 blocks >= 11:30 ===");
const verify = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, startTime: { gte: "11:30" }, blockType: { in: ["CLASS","DISMISSAL","LUNCH"] } },
  orderBy: { startTime: "asc" },
});
for (const b of verify) console.log(`  ${b.blockType.padEnd(10)} ${b.startTime}-${b.endTime} level=${b.level}`);

await p.$disconnect();
console.log("\nDone!");
