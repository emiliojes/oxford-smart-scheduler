import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });

// Fix assignments at 10:45 that are in SECONDARY blocks (10:45-11:45)
// They should be in LOW_SECONDARY blocks (10:45-11:30) - Hour 4
const wrong = await p.assignment.findMany({
  where: {
    gradeId: grade.id,
    timeBlock: { startTime: "10:45", endTime: "11:45" }
  },
  include: { subject: true, timeBlock: true }
});

console.log(`🔧 Assignments at 10:45-11:45 (wrong): ${wrong.length}\n`);

for (const a of wrong) {
  const correct = await p.timeBlock.findFirst({
    where: { level: "LOW_SECONDARY", dayOfWeek: a.timeBlock.dayOfWeek, startTime: "10:45", endTime: "11:30" }
  });
  if (correct) {
    await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: correct.id } });
    console.log(`✅ ${days[a.timeBlock.dayOfWeek]} | ${a.subject.name} | 10:45-11:45 → 10:45-11:30`);
  } else {
    console.log(`❌ No LOW_SECONDARY block 10:45-11:30 for ${days[a.timeBlock.dayOfWeek]}`);
  }
}

// Also fix wrong level blocks for 7:30, 8:30, 9:45 (use SECONDARY or LOW_SECONDARY)
// These have same start times so they don't cause extra rows, but let's verify
console.log("\n✅ Done!");
await p.$disconnect();
