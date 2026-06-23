import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const grade = await p.grade.findFirst({ where: { name: "6", section: "B" } });

// Remap wrong startTime-endTime combos to correct LOW_SECONDARY blocks
const remapStart = {
  "11:45": "12:00",  // 11:45-12:45 SECONDARY → 12:00-13:00 LOW_SECONDARY
  "13:15": "13:00",  // 13:15-14:15 SECONDARY → 13:00-14:00 LOW_SECONDARY
  "14:15": "14:00",  // 14:15-15:15 SECONDARY → 14:00-15:15 LOW_SECONDARY
};

// Hour 4 remap: 10:45-11:45 SECONDARY → 10:45-11:30 LOW_SECONDARY
const wrongHour4Start = "10:45";
const wrongHour4End = "11:45";

const assignments = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, timeBlock: true }
});

let fixed = 0;

for (const a of assignments) {
  const tb = a.timeBlock;

  // Fix Hour 4: 10:45-11:45 → 10:45-11:30
  if (tb.startTime === wrongHour4Start && tb.endTime === wrongHour4End) {
    const correct = await p.timeBlock.findFirst({
      where: { level: "LOW_SECONDARY", dayOfWeek: tb.dayOfWeek, startTime: "10:45", endTime: "11:30" }
    });
    if (correct) {
      await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: correct.id } });
      console.log(`✅ ${days[tb.dayOfWeek]} | ${a.subject.name.padEnd(20)} | 10:45-11:45 → 10:45-11:30`);
      fixed++;
    }
    continue;
  }

  // Fix Hours 5, 6, 7 wrong start times
  const correctStart = remapStart[tb.startTime];
  if (!correctStart) continue;

  const correct = await p.timeBlock.findFirst({
    where: { level: "LOW_SECONDARY", dayOfWeek: tb.dayOfWeek, startTime: correctStart }
  });
  if (correct) {
    await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: correct.id } });
    console.log(`✅ ${days[tb.dayOfWeek]} | ${a.subject.name.padEnd(20)} | ${tb.startTime} → ${correctStart}`);
    fixed++;
  } else {
    console.log(`❌ No LOW_SECONDARY block found for ${days[tb.dayOfWeek]} ${correctStart}`);
  }
}

console.log(`\n✅ Fixed: ${fixed} assignments`);
await p.$disconnect();
