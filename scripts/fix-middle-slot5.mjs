/**
 * Middle School slot 5: 11:45-12:30 → 11:45-12:45 (60 min)
 * High School slot 5 stays 11:45-12:45 (already correct)
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const blocks = await p.timeBlock.findMany({
  where: { startTime: "11:45", endTime: "12:30", blockType: "CLASS" },
});
console.log(`Found ${blocks.length} blocks (11:45-12:30) to update`);

for (const b of blocks) {
  await p.timeBlock.update({
    where: { id: b.id },
    data: { endTime: "12:45", duration: "60" },
  });
  console.log(`  Day${b.dayOfWeek}: updated to 11:45-12:45`);
}

// Verify
const verify = await p.timeBlock.findMany({
  where: { startTime: "11:45", blockType: "CLASS" },
  orderBy: { endTime: "asc" },
});
console.log("\n11:45 CLASS blocks after fix:");
for (const b of verify) console.log(`  Day${b.dayOfWeek} ${b.startTime}-${b.endTime}`);

await p.$disconnect();
console.log("\nDone!");
