/**
 * Fix timeblock levels:
 * - Blocks used by grades 6-8 (Middle) → LOW_SECONDARY
 * - Blocks used by grades 9-12 (High)  → SECONDARY (already correct)
 *
 * Affected blocks: 10:45-11:30, 12:00-13:00, 13:00-14:00, 14:00-15:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const middleStartTimes = ["10:45", "12:00", "13:00", "14:00"];

let fixed = 0;
for (const st of middleStartTimes) {
  const blocks = await p.timeBlock.findMany({
    where: { startTime: st, level: { in: ["SECONDARY", "BOTH"] } },
  });
  for (const b of blocks) {
    const asgns = await p.assignment.findMany({
      where: { timeBlockId: b.id },
      include: { grade: true },
      take: 1,
    });
    const gradeNum = Number(asgns[0]?.grade?.name ?? "0");
    if ([6, 7, 8].includes(gradeNum)) {
      await p.timeBlock.update({ where: { id: b.id }, data: { level: "LOW_SECONDARY" } });
      console.log(`✓ ${b.startTime}-${b.endTime} id:${b.id.slice(-6)} → LOW_SECONDARY (grade ${gradeNum})`);
      fixed++;
    } else if (asgns.length === 0) {
      // No assignments — delete orphan block
      await p.timeBlock.delete({ where: { id: b.id } });
      console.log(`✗ ${b.startTime}-${b.endTime} id:${b.id.slice(-6)} → deleted (no assignments)`);
    } else {
      console.log(`  ${b.startTime}-${b.endTime} id:${b.id.slice(-6)} → kept SECONDARY (grade ${gradeNum})`);
    }
  }
}

console.log(`\nFixed: ${fixed} timeblocks → LOW_SECONDARY`);
await p.$disconnect();
