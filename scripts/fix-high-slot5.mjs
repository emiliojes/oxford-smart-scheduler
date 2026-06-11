/**
 * High School slot 5 should be 11:45-12:45 (not 12:30).
 * Middle slot 5 stays 11:45-12:30.
 * 
 * Current state: all SECONDARY slot 5 = 11:45-12:30 (same timeblock)
 * 
 * Strategy: create new HIGH-specific slot 5 (11:45-12:45) for each day,
 * then move High grade assignments from current slot 5 to new one.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const highGradeNames = ["9","10","11","12"];
const highGrades = await p.grade.findMany({
  where: { level: "SECONDARY", name: { in: highGradeNames } },
});
console.log("High grades:", highGrades.map(g => g.name + (g.section ?? "")).join(", "));

// Get current slot 5 timeblocks (11:45 - 12:30)
const slot5blocks = await p.timeBlock.findMany({
  where: { blockType: "CLASS", level: "SECONDARY", startTime: "11:45" },
  orderBy: { dayOfWeek: "asc" },
});
console.log(`Found ${slot5blocks.length} slot5 blocks (11:45-12:30)`);

for (const oldTB of slot5blocks) {
  // Create new HIGH slot 5 for this day: 11:45-12:45
  const newTB = await p.timeBlock.create({
    data: {
      dayOfWeek: oldTB.dayOfWeek,
      startTime: "11:45",
      endTime:   "12:45",
      duration:  "60",
      blockType: "CLASS",
      level:     "SECONDARY",
    },
  });

  // Move High grade assignments from old slot5 to new one
  for (const grade of highGrades) {
    const asgns = await p.assignment.findMany({
      where: { gradeId: grade.id, timeBlockId: oldTB.id },
    });
    for (const a of asgns) {
      await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: newTB.id } });
    }
    if (asgns.length) {
      console.log(`  Day${oldTB.dayOfWeek} ${grade.name}${grade.section ?? ""}: moved ${asgns.length} assignment(s) to new 11:45-12:45`);
    }
  }
}

// Verify day 1
const verifyBlocks = await p.timeBlock.findMany({
  where: { level: "SECONDARY", dayOfWeek: 1, blockType: "CLASS" },
  orderBy: { startTime: "asc" },
});
console.log("\nSECONDARY CLASS blocks day 1 after fix:");
for (const b of verifyBlocks) console.log(`  ${b.startTime} - ${b.endTime}`);

await p.$disconnect();
console.log("\nDone!");
