import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Remove old DB LUNCH blocks (12:30-13:00) — replaced by virtual blocks in frontend
const lunches = await p.timeBlock.findMany({ where: { blockType: "LUNCH" } });
console.log(`LUNCH blocks in DB: ${lunches.length}`);
for (const b of lunches) {
  const cnt = await p.assignment.count({ where: { timeBlockId: b.id } });
  if (cnt === 0) {
    await p.timeBlock.delete({ where: { id: b.id } });
    console.log(`  Deleted Day${b.dayOfWeek} ${b.startTime}-${b.endTime}`);
  } else {
    console.log(`  KEPT Day${b.dayOfWeek} ${b.startTime}-${b.endTime} (has ${cnt} assignments)`);
  }
}

await p.$disconnect();
console.log("Done!");
