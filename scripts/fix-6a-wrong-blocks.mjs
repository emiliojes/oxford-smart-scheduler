import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });

// Mapping: wrong startTime → correct LOW_SECONDARY startTime
const remapStart = {
  "11:45": "12:00",
  "13:15": "13:00",
  "14:15": "14:00",
};

const assignments = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, timeBlock: true }
});

console.log("🔧 FIXING 6A ASSIGNMENTS TO CORRECT LOW_SECONDARY BLOCKS\n");

let fixed = 0, skipped = 0;

for (const a of assignments) {
  const tb = a.timeBlock;
  const correctStart = remapStart[tb.startTime];

  if (!correctStart) { skipped++; continue; }

  // Find the correct LOW_SECONDARY block for this day
  const correctBlock = await p.timeBlock.findFirst({
    where: {
      level: "LOW_SECONDARY",
      dayOfWeek: tb.dayOfWeek,
      startTime: correctStart
    }
  });

  if (!correctBlock) {
    console.log(`❌ No LOW_SECONDARY block found for ${days[tb.dayOfWeek]} ${correctStart}`);
    skipped++;
    continue;
  }

  await p.assignment.update({
    where: { id: a.id },
    data: { timeBlockId: correctBlock.id }
  });

  console.log(`✅ ${days[tb.dayOfWeek]} | ${a.subject.name.padEnd(20)} | ${tb.startTime} → ${correctStart}`);
  fixed++;
}

console.log(`\n✅ Fixed: ${fixed} | Skipped (already correct): ${skipped}`);

// Verify result
console.log("\n📋 AFTER FIX - All 6A assignments:\n");
const after = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: 'asc' } }, { timeBlock: { startTime: 'asc' } }]
});
for (const a of after) {
  const tb = a.timeBlock;
  console.log(`${days[tb.dayOfWeek]} | ${tb.startTime}-${tb.endTime} | ${a.subject.name.padEnd(20)} | ${tb.level}`);
}

await p.$disconnect();
