import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const grade = await p.grade.findFirst({ where: { name: "6", section: "B" } });

if (!grade) { console.log("❌ Grade 6B not found"); process.exit(1); }

const assignments = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: 'asc' } }, { timeBlock: { startTime: 'asc' } }]
});

const correctStarts = ["07:15","07:30","08:30","09:30","09:45","10:45","11:30","12:00","13:00","14:00","15:15"];

console.log(`📋 6B ASSIGNMENTS (${assignments.length} total):\n`);

let wrongCount = 0;
for (const a of assignments) {
  const tb = a.timeBlock;
  const isCorrect = correctStarts.includes(tb.startTime) && tb.level === "LOW_SECONDARY";
  const flag = isCorrect ? "✅" : "❌ WRONG";
  if (!isCorrect) wrongCount++;
  console.log(`${days[tb.dayOfWeek]} | ${tb.startTime}-${tb.endTime} | ${a.subject.name.padEnd(20)} | ${tb.level} ${flag}`);
}

console.log(`\n❌ Wrong blocks: ${wrongCount}`);
console.log(`✅ Correct blocks: ${assignments.length - wrongCount}`);

await p.$disconnect();
