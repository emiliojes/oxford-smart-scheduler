/**
 * Implements Middle/High lunch split in the DB:
 *
 * BEFORE (shared):
 *   Slot 5: 11:45 - 12:45  CLASS
 *   LUNCH:  12:45 - 13:15  LUNCH
 *   Slot 6: 13:15 - 14:15  CLASS
 *   Slot 7: 14:15 - 15:15  CLASS
 *
 * AFTER:
 *   Slot 5: 11:45 - 12:30  CLASS  (shared - ends earlier)
 *   LUNCH SECONDARY: 12:30 - 13:00  (Middle uses this)
 *   Slot 6 MIDDLE:   13:00 - 14:00  CLASS (new - Middle post-lunch)
 *   Slot 7 MIDDLE:   14:00 - 15:00  CLASS (new - Middle post-lunch)
 *   LUNCH HIGH:      13:00 - 13:30  (High uses this - virtual in frontend)
 *   Slot 6 HIGH:     13:30 - 14:30  CLASS (new - High post-lunch)
 *   Slot 7 HIGH:     14:30 - 15:30  CLASS (new - High post-lunch)
 *
 * Strategy:
 * - Update existing slot 5 endTime: 12:45 → 12:30
 * - Update SECONDARY LUNCH: 12:45-13:15 → 12:30-13:00
 * - Update existing slot 6 (13:15→14:15) to be Middle: 13:00-14:00
 * - Update existing slot 7 (14:15→15:15) to be Middle: 14:00-15:00
 * - Create new slot 6 HIGH: 13:30-14:30 for each weekday
 * - Create new slot 7 HIGH: 14:30-15:30 for each weekday
 * - Update DISMISSAL: 15:15→15:30 stays for Middle, add 15:30→15:45 for High
 * - Migrate assignments from old slot 6/7 timeblocks to new ones based on grade level
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// ── Step 1: Update slot 5 endTime 12:45 → 12:30 ─────────────────
console.log("Step 1: Updating slot 5 endTime...");
const slot5s = await p.timeBlock.findMany({
  where: { blockType: "CLASS", level: "SECONDARY", startTime: "11:45" },
});
for (const b of slot5s) {
  await p.timeBlock.update({ where: { id: b.id }, data: { endTime: "12:30" } });
}
console.log(`  Updated ${slot5s.length} slot5 blocks`);

// ── Step 2: Update SECONDARY LUNCH 12:45-13:15 → 12:30-13:00 ────
console.log("Step 2: Updating SECONDARY LUNCH times...");
const lunchBlocks = await p.timeBlock.findMany({
  where: { blockType: "LUNCH", level: "SECONDARY" },
});
for (const b of lunchBlocks) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "12:30", endTime: "13:00" } });
}
console.log(`  Updated ${lunchBlocks.length} lunch blocks`);

// ── Step 3: Update existing slot 6 (13:15-14:15) → Middle 13:00-14:00 ──
console.log("Step 3: Updating slot 6 to Middle times...");
const slot6s = await p.timeBlock.findMany({
  where: { blockType: "CLASS", level: "SECONDARY", startTime: "13:15" },
  orderBy: { dayOfWeek: "asc" },
});
for (const b of slot6s) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "13:00", endTime: "14:00" } });
}
console.log(`  Updated ${slot6s.length} slot6 blocks`);

// ── Step 4: Update existing slot 7 (14:15-15:15) → Middle 14:00-15:00 ──
console.log("Step 4: Updating slot 7 to Middle times...");
const slot7s = await p.timeBlock.findMany({
  where: { blockType: "CLASS", level: "SECONDARY", startTime: "14:15" },
  orderBy: { dayOfWeek: "asc" },
});
for (const b of slot7s) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "14:00", endTime: "15:00" } });
}
console.log(`  Updated ${slot7s.length} slot7 blocks`);

// ── Step 5: Update DISMISSAL 15:15-15:30 → 15:00-15:15 for Middle ──
console.log("Step 5: Updating SECONDARY DISMISSAL...");
const dismissals = await p.timeBlock.findMany({ where: { blockType: "DISMISSAL", level: "SECONDARY" } });
for (const b of dismissals) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "15:00", endTime: "15:15" } });
}
console.log(`  Updated ${dismissals.length} dismissal blocks`);

// ── Step 6: Create HIGH slot 6 (13:30-14:30) and slot 7 (14:30-15:30) ──
console.log("Step 6: Creating HIGH post-lunch slots...");
const highGrades = await p.grade.findMany({
  where: { level: "SECONDARY", name: { in: ["9","10","11","12"] } },
});
console.log(`  High grades: ${highGrades.map(g=>g.name+g.section).join(", ")}`);

let createdHigh6 = 0, createdHigh7 = 0;
for (const day of [1,2,3,4,5]) {
  const tb6 = await p.timeBlock.create({
    data: { dayOfWeek: day, startTime: "13:30", endTime: "14:30", duration: "60", blockType: "CLASS", level: "SECONDARY" },
  });
  const tb7 = await p.timeBlock.create({
    data: { dayOfWeek: day, startTime: "14:30", endTime: "15:30", duration: "60", blockType: "CLASS", level: "SECONDARY" },
  });
  createdHigh6++;
  createdHigh7++;

  // Migrate HIGH grade assignments from old slot times (now 13:00/14:00) to new HIGH slots
  // Find assignments for High grades at the updated Middle slots and move them
  for (const grade of highGrades) {
    // Move slot 6 assignments (now startTime 13:00) to 13:30
    const asgn6 = await p.assignment.findMany({
      where: { gradeId: grade.id, timeBlock: { dayOfWeek: day, startTime: "13:00" } },
    });
    for (const a of asgn6) {
      await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: tb6.id } });
    }
    // Move slot 7 assignments (now startTime 14:00) to 14:30
    const asgn7 = await p.assignment.findMany({
      where: { gradeId: grade.id, timeBlock: { dayOfWeek: day, startTime: "14:00" } },
    });
    for (const a of asgn7) {
      await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: tb7.id } });
    }
  }
}
console.log(`  Created ${createdHigh6} HIGH slot6 + ${createdHigh7} HIGH slot7 blocks`);

// ── Step 7: Add HIGH DISMISSAL at 15:30 ──────────────────────────
console.log("Step 7: Creating HIGH DISMISSAL blocks...");
for (const day of [1,2,3,4,5]) {
  await p.timeBlock.create({
    data: { dayOfWeek: day, startTime: "15:30", endTime: "15:45", duration: "15", blockType: "DISMISSAL", level: "SECONDARY" },
  });
}
console.log("  Created 5 HIGH dismissal blocks");

// ── Verify ────────────────────────────────────────────────────────
console.log("\n── Verification (day 1 SECONDARY) ──────────────────────");
const verifyBlocks = await p.timeBlock.findMany({
  where: { level: "SECONDARY", dayOfWeek: 1 },
  orderBy: { startTime: "asc" },
});
for (const b of verifyBlocks) {
  console.log(`  ${b.startTime} - ${b.endTime} | ${b.blockType.padEnd(12)} | ${b.level}`);
}

await p.$disconnect();
console.log("\nDone!");
