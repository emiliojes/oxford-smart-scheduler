import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const days = ["","MON","TUE","WED","THU","FRI"];

const gradeName = process.argv[2] ?? "11B";
const name = gradeName.slice(0,-1);
const section = gradeName.slice(-1);
const grade = await p.grade.findFirst({ where: { name, section } });
console.log(`Grade ${gradeName} (${grade?.id}):`);

const asgns = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, teacher: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
asgns.forEach(a => console.log(`  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}  ${a.subject.name.padEnd(25)} Teacher: ${a.teacher?.name ?? "NONE"}`));
console.log(`Total: ${asgns.length}`);
await p.$disconnect();
