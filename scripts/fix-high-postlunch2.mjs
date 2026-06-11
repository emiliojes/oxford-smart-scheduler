/**
 * High School post-lunch final layout:
 *   Clase 6:   13:30 - 14:30 (60 min)
 *   Clase 7:   14:30 - 15:15 (45 min)
 *   Departure: 15:15
 *
 * Current state in DB:
 *   13:30-14:15, 14:15-15:00, DISMISSAL 15:00-15:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Fix Clase 6: 13:30-14:15 → 13:30-14:30
const slot6 = await p.timeBlock.findMany({
  where: { startTime: "13:30", endTime: "14:15", blockType: "CLASS" },
});
console.log(`Slot6 (13:30-14:15): ${slot6.length} blocks`);
for (const b of slot6) {
  await p.timeBlock.update({ where: { id: b.id }, data: { endTime: "14:30", duration: "60" } });
}

// 2. Fix Clase 7: 14:15-15:00 → 14:30-15:15 (startTime changes → new blocks + migrate)
const slot7old = await p.timeBlock.findMany({
  where: { startTime: "14:15", endTime: "15:00", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Slot7 (14:15-15:00): ${slot7old.length} blocks`);
for (const oldTB of slot7old) {
  const newTB = await p.timeBlock.create({
    data: {
      dayOfWeek: oldTB.dayOfWeek,
      startTime: "14:30",
      endTime:   "15:15",
      duration:  "45",
      blockType: "CLASS",
      level:     oldTB.level,
    },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: oldTB.id } });
  for (const a of asgns) {
    await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  }
  console.log(`  Day${oldTB.dayOfWeek}: 14:15→14:30, migrated ${asgns.length} assignments`);
  await p.timeBlock.delete({ where: { id: oldTB.id } });
}

// 3. Fix DISMISSAL: 15:00-15:15 → 15:15-15:15
const dismissal = await p.timeBlock.findMany({
  where: { startTime: "15:00", blockType: "DISMISSAL" },
});
console.log(`Dismissal (15:00): ${dismissal.length} blocks`);
for (const b of dismissal) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "15:15", endTime: "15:15", duration: "0" } });
}

// Verify
console.log("\nHigh blocks day 1 after fix:");
const verify = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, level: "SECONDARY", blockType: { in: ["CLASS","DISMISSAL","LUNCH"] } },
  orderBy: { startTime: "asc" },
});
for (const b of verify) console.log(`  ${b.blockType.padEnd(10)} ${b.startTime} - ${b.endTime}`);

await p.$disconnect();
console.log("\nDone!");
