/**
 * Middle School final schedule:
 *   Clase 4:  10:45 - 11:30 (45 min)  [was 10:45-11:45]
 *   Lunch:    11:30 - 12:00 (virtual)  [was 12:30-13:00]
 *   Clase 5:  12:00 - 13:00 (60 min)  [was 11:45-12:30]
 *   Clase 6:  13:00 - 14:00 (60 min)  [unchanged]
 *   Clase 7:  14:00 - 15:15 (75 min)  [was 14:00-15:00]
 *   Departure: 15:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Helper to get grade name from assignment
const isMiddleBlock = async (tbId) => {
  const asgns = await p.assignment.findMany({ where: { timeBlockId: tbId }, include: { grade: true } });
  if (!asgns.length) return null; // unknown
  return asgns.every(a => ["6","7","8"].includes(a.grade.name));
};

// 1. Clase 4: 10:45-11:45 → 10:45-11:30
// This block is shared — both Middle and High use it. We need separate blocks.
const slot4 = await p.timeBlock.findMany({
  where: { startTime: "10:45", endTime: "11:45", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Slot4 (10:45-11:45): ${slot4.length} blocks`);
for (const b of slot4) {
  const mid = await isMiddleBlock(b.id);
  if (mid === true) {
    // Create new Middle block 10:45-11:30 and migrate
    const newTB = await p.timeBlock.create({
      data: { dayOfWeek: b.dayOfWeek, startTime: "10:45", endTime: "11:30", duration: "45", blockType: "CLASS", level: b.level },
    });
    const asgns = await p.assignment.findMany({ where: { timeBlockId: b.id } });
    for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
    await p.timeBlock.delete({ where: { id: b.id } });
    console.log(`  Day${b.dayOfWeek}: Middle 10:45→11:30, migrated ${asgns.length}`);
  } else if (mid === false) {
    console.log(`  Day${b.dayOfWeek}: High block, keep 10:45-11:45`);
  } else {
    console.log(`  Day${b.dayOfWeek}: no assignments, deleting empty block`);
    await p.timeBlock.delete({ where: { id: b.id } });
  }
}

// 2. Clase 5: 11:45-12:30 (Middle) → 12:00-13:00
// startTime changes so create new + migrate
const slot5mid = await p.timeBlock.findMany({
  where: { startTime: "11:45", endTime: "12:30", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`\nSlot5 Middle (11:45-12:30): ${slot5mid.length} blocks`);
for (const b of slot5mid) {
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: b.dayOfWeek, startTime: "12:00", endTime: "13:00", duration: "60", blockType: "CLASS", level: b.level },
  });
  const asgns = await p.assignment.findMany({ where: { timeBlockId: b.id } });
  for (const a of asgns) await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  await p.timeBlock.delete({ where: { id: b.id } });
  console.log(`  Day${b.dayOfWeek}: 11:45→12:00-13:00, migrated ${asgns.length}`);
}

// 3. Clase 7: 14:00-15:00 (Middle) → 14:00-15:15
const slot7mid = await p.timeBlock.findMany({
  where: { startTime: "14:00", endTime: "15:00", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`\nSlot7 Middle (14:00-15:00): ${slot7mid.length} blocks`);
for (const b of slot7mid) {
  await p.timeBlock.update({ where: { id: b.id }, data: { endTime: "15:15", duration: "75" } });
  console.log(`  Day${b.dayOfWeek}: 15:00→15:15`);
}

// 4. Update virtual lunch in frontend (no DB change needed — handled in code)
// But update DISMISSAL for Middle to 15:15
const dis = await p.timeBlock.findMany({ where: { startTime: "15:00", endTime: "15:15", blockType: "DISMISSAL" } });
console.log(`\nDismissal (15:00-15:15): ${dis.length} — updating to 15:15`);
for (const b of dis) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "15:15", endTime: "15:15", duration: "0" } });
}

// Verify
console.log("\n=== Middle blocks day 1 after fix ===");
const verify = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, level: { in: ["SECONDARY","BOTH"] } },
  orderBy: { startTime: "asc" },
});
verify.forEach(b => console.log(`  ${b.blockType.padEnd(12)} ${b.startTime} - ${b.endTime}`));

await p.$disconnect();
console.log("\nDone!");
