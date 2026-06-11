/**
 * Migrates SECONDARY time blocks to the correct Oxford schedule times.
 *
 * Current DB (wrong)     →  Oxford correct
 * 07:00 - 07:00 CLASS   →  07:30 - 08:30
 * 08:00 - 08:00 CLASS   →  08:30 - 09:30
 * 09:00 - 09:00 CLASS   →  09:45 - 10:45
 * 10:00 - 10:00 CLASS   →  10:45 - 11:45
 * 10:30 - 10:30 CLASS   →  11:45 - 12:45
 * 11:30 - 11:30 CLASS   →  13:15 - 14:15
 * 12:30 - 12:30 CLASS   →  14:15 - 15:15
 *
 * Also adds (per day) if missing:
 *   07:15 - 07:30  REGISTRATION
 *   09:30 - 09:45  BREAK
 *   12:45 - 13:15  LUNCH
 *   15:15 - 15:30  DISMISSAL
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = [1, 2, 3, 4, 5];

// Ordered mapping: current startTime → { new startTime, new endTime }
const CLASS_MAP = [
  { from: "07:00", startTime: "07:30", endTime: "08:30" },
  { from: "08:00", startTime: "08:30", endTime: "09:30" },
  { from: "09:00", startTime: "09:45", endTime: "10:45" },
  { from: "10:00", startTime: "10:45", endTime: "11:45" },
  { from: "10:30", startTime: "11:45", endTime: "12:45" },
  { from: "11:30", startTime: "13:15", endTime: "14:15" },
  { from: "12:30", startTime: "14:15", endTime: "15:15" },
];

const EXTRA_BLOCKS = [
  { startTime: "07:15", endTime: "07:30", blockType: "REGISTRATION", duration: "15" },
  { startTime: "09:30", endTime: "09:45", blockType: "BREAK",        duration: "15" },
  { startTime: "12:45", endTime: "13:15", blockType: "LUNCH",        duration: "30" },
  { startTime: "15:15", endTime: "15:30", blockType: "DISMISSAL",    duration: "15" },
];

console.log("=== FIXING SECONDARY TIME BLOCKS ===\n");

let updated = 0, added = 0, skipped = 0;

for (const day of DAYS) {
  console.log(`── Day ${day} ──`);

  // 1. Update CLASS blocks
  for (const map of CLASS_MAP) {
    const block = await p.timeBlock.findFirst({
      where: { dayOfWeek: day, startTime: map.from, level: "SECONDARY", blockType: "CLASS" },
    });
    if (!block) {
      console.log(`  SKIP (not found): ${map.from} CLASS`);
      skipped++;
      continue;
    }
    await p.timeBlock.update({
      where: { id: block.id },
      data: { startTime: map.startTime, endTime: map.endTime, duration: "60" },
    });
    console.log(`  UPDATED: ${map.from} → ${map.startTime} - ${map.endTime}`);
    updated++;
  }

  // 2. Add REGISTRATION / BREAK / LUNCH / DISMISSAL if missing
  for (const extra of EXTRA_BLOCKS) {
    const existing = await p.timeBlock.findFirst({
      where: { dayOfWeek: day, startTime: extra.startTime, level: "SECONDARY" },
    });
    if (existing) {
      console.log(`  EXISTS: ${extra.startTime} ${extra.blockType}`);
      skipped++;
      continue;
    }
    await p.timeBlock.create({
      data: {
        dayOfWeek: day,
        startTime: extra.startTime,
        endTime: extra.endTime,
        blockType: extra.blockType,
        duration: extra.duration,
        level: "SECONDARY",
      },
    });
    console.log(`  ADDED:   ${extra.startTime} - ${extra.endTime} ${extra.blockType}`);
    added++;
  }
}

console.log(`\n✅ Done: ${updated} updated, ${added} added, ${skipped} skipped`);

// Verify result
const result = await p.timeBlock.findMany({
  where: { level: "SECONDARY", dayOfWeek: 1 },
  orderBy: [{ startTime: "asc" }],
});
console.log("\nMonday SECONDARY time blocks after migration:");
for (const b of result) {
  console.log(`  ${b.startTime} - ${b.endTime}  [${b.blockType}]`);
}

await p.$disconnect();
