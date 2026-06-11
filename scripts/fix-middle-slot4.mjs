/**
 * Slot 4 for Middle: assignments are currently on 10:45-11:45 HIGH blocks.
 * Create new Middle blocks 10:45-11:30 and migrate Middle-grade assignments there.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const highBlocks = await p.timeBlock.findMany({
  where: { startTime: "10:45", endTime: "11:45", blockType: "CLASS" },
  orderBy: { dayOfWeek: "asc" },
});

for (const b of highBlocks) {
  const allAsgns = await p.assignment.findMany({
    where: { timeBlockId: b.id },
    include: { grade: true },
  });
  const middleAsgns = allAsgns.filter(a => ["6","7","8"].includes(a.grade.name));
  if (!middleAsgns.length) continue;

  // Create Middle-specific block for this day
  const newTB = await p.timeBlock.create({
    data: { dayOfWeek: b.dayOfWeek, startTime: "10:45", endTime: "11:30", duration: "45", blockType: "CLASS", level: b.level },
  });
  for (const a of middleAsgns) {
    await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
  }
  console.log(`Day${b.dayOfWeek}: created 10:45-11:30, migrated ${middleAsgns.length} Middle assignments`);
}

// Also need to add 11:30-12:00 LUNCH virtual block — handled in frontend
// Verify
console.log("\nSlot4 blocks day 1:");
const v = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, startTime: "10:45" },
  orderBy: { endTime: "asc" },
});
v.forEach(b => console.log(`  ${b.startTime}-${b.endTime} ${b.blockType}`));

await p.$disconnect();
console.log("Done!");
