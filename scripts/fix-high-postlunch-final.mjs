/**
 * High School post-lunch final:
 *   Lunch:   12:45 - 13:15 (virtual, frontend only)
 *   Clase 6: 13:15 - 14:15  [was 13:30-14:30]
 *   Clase 7: 14:15 - 15:15  [was 14:30-15:15]
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Clase 6: 13:30-14:30 → 13:15-14:15 (startTime changes)
const slot6 = await p.timeBlock.findMany({
  where: { startTime: "13:30", endTime: "14:30", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Slot6 (13:30-14:30): ${slot6.length} blocks`);
for (const b of slot6) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: b.dayOfWeek, startTime: "13:15", endTime: "14:15", duration: "60", blockType: "CLASS", level: b.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: b.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: b.id } });
  console.log(`  Day${b.dayOfWeek}: 13:30→13:15, migrated ${asgns.length}`);
}

// 2. Clase 7: 14:30-15:15 → 14:15-15:15 (startTime changes)
const slot7 = await p.timeBlock.findMany({
  where: { startTime: "14:30", endTime: "15:15", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`\nSlot7 (14:30-15:15): ${slot7.length} blocks`);
for (const b of slot7) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: b.dayOfWeek, startTime: "14:15", endTime: "15:15", duration: "60", blockType: "CLASS", level: b.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: b.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: b.id } });
  console.log(`  Day${b.dayOfWeek}: 14:30→14:15, migrated ${asgns.length}`);
}

// Verify
console.log("\nHigh blocks >= 12:45 day 1:");
const v = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, startTime: { gte: "12:45" }, level: { in: ["SECONDARY","BOTH"] } },
  orderBy: { startTime: "asc" },
});
v.forEach(b => console.log(`  ${b.blockType.padEnd(10)} ${b.startTime}-${b.endTime}`));

await p.$disconnect();
console.log("\nDone!");
