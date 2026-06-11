/**
 * Middle post-lunch slots correct times:
 *   Clase 6: 13:15 - 14:15 (60 min)  [currently 13:00-14:00]
 *   Clase 7: 14:15 - 15:15 (60 min)  [currently 14:00-15:00]
 *   Departure: 15:15
 *
 * startTime changes so we need new blocks + migrate assignments
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// --- Clase 6: 13:00-14:00 → 13:15-14:15 ---
const slot6old = await p.timeBlock.findMany({
  where: { startTime: "13:00", endTime: "14:00", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Slot6 (13:00-14:00): ${slot6old.length} blocks`);
for (const oldTB of slot6old) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: oldTB.dayOfWeek, startTime: "13:15", endTime: "14:15", duration: "60", blockType: "CLASS", level: oldTB.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: oldTB.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: oldTB.id } });
  console.log(`  Day${oldTB.dayOfWeek}: 13:00→13:15, migrated ${asgns.length} assignments`);
}

// --- Clase 7: 14:00-15:00 → 14:15-15:15 ---
const slot7old = await p.timeBlock.findMany({
  where: { startTime: "14:00", endTime: "15:00", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Slot7 (14:00-15:00): ${slot7old.length} blocks`);
for (const oldTB of slot7old) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: oldTB.dayOfWeek, startTime: "14:15", endTime: "15:15", duration: "60", blockType: "CLASS", level: oldTB.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: oldTB.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: oldTB.id } });
  console.log(`  Day${oldTB.dayOfWeek}: 14:00→14:15, migrated ${asgns.length} assignments`);
}

// Verify
console.log("\nAll CLASS blocks >= 13:00 day 1 after fix:");
const verify = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, blockType: { in: ["CLASS","DISMISSAL"] }, startTime: { gte: "13:00" } },
  orderBy: { startTime: "asc" },
});
for (const b of verify) console.log(`  ${b.startTime}-${b.endTime} level=${b.level}`);

await p.$disconnect();
console.log("\nDone!");
