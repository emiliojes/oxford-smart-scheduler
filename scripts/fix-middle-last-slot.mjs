/**
 * Middle School last CLASS slot: 14:00-15:00 → 14:00-15:15 (75 min)
 * Also fix DISMISSAL for Middle: 15:00 → 15:15
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Fix last class slot 14:00-15:00 → 14:00-15:15
const slot7 = await p.timeBlock.findMany({
  where: { startTime: "14:00", endTime: "15:00", blockType: "CLASS" },
});
console.log(`Last class blocks (14:00-15:00): ${slot7.length}`);
for (const b of slot7) {
  await p.timeBlock.update({ where: { id: b.id }, data: { endTime: "15:15", duration: "75" } });
  console.log(`  Day${b.dayOfWeek}: updated to 14:00-15:15`);
}

// 2. Fix Middle DISMISSAL: if any at 15:00 → 15:15
const dis = await p.timeBlock.findMany({
  where: { startTime: "15:00", blockType: "DISMISSAL" },
});
console.log(`Dismissal blocks at 15:00: ${dis.length}`);
for (const b of dis) {
  await p.timeBlock.update({ where: { id: b.id }, data: { startTime: "15:15", endTime: "15:15", duration: "0" } });
  console.log(`  Day${b.dayOfWeek}: dismissal moved to 15:15`);
}

// Verify Middle post-lunch blocks day 1
console.log("\nMiddle CLASS/DISMISSAL blocks day 1:");
const verify = await p.timeBlock.findMany({
  where: { dayOfWeek: 1, blockType: { in: ["CLASS","DISMISSAL"] }, startTime: { gte: "13:00" } },
  orderBy: { startTime: "asc" },
});
for (const b of verify) console.log(`  ${b.blockType.padEnd(10)} ${b.startTime} - ${b.endTime}`);

await p.$disconnect();
console.log("\nDone!");
