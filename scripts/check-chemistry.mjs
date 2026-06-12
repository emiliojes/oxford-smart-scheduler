import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const days = ["","MON","TUE","WED","THU","FRI"];

const asgns = await p.assignment.findMany({
  where: { subject: { name: "Chemistry" } },
  include: { grade: true, subject: true, teacher: true, timeBlock: true },
  orderBy: [{ grade: { name: "asc" } }, { timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
console.log(`Chemistry assignments (${asgns.length}):`);
asgns.forEach(a => console.log(`  ${a.grade.name}${a.grade.section}  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}  Teacher: ${a.teacher?.name}`));
await p.$disconnect();
