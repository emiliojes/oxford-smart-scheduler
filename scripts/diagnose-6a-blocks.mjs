import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });
const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const assignments = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: 'asc' } }, { timeBlock: { startTime: 'asc' } }]
});

console.log("📋 ALL 6A ASSIGNMENTS WITH TIME BLOCK DETAILS:\n");

for (const a of assignments) {
  const tb = a.timeBlock;
  const isStandard = ["07:30","08:30","09:45","10:45","12:00","13:00","14:00"].includes(tb.startTime);
  const flag = isStandard ? "✅" : "❌ WRONG BLOCK";
  console.log(`${days[tb.dayOfWeek]} | ${tb.startTime}-${tb.endTime} | ${a.subject.name.padEnd(20)} | level: ${tb.level} ${flag}`);
}

await p.$disconnect();
