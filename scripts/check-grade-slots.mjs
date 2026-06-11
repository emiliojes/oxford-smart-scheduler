import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check what assignments exist for grades 9A,9B,11A,11B,12A in the slots Irlanda should teach
const grades = ["9A","9B","11A","11B","12A"];
const days = ["","MON","TUE","WED","THU","FRI"];

for (const gradeName of grades) {
  const grade = await p.grade.findFirst({ where: { name: gradeName.replace(/[AB]/,""), section: gradeName.slice(-1) } });
  if (!grade) { console.log(`Grade ${gradeName} not found`); continue; }

  const asgns = await p.assignment.findMany({
    where: { gradeId: grade.id },
    include: { subject: true, teacher: true, timeBlock: true },
    orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
  });
  console.log(`\nGrade ${gradeName}:`);
  for (const a of asgns) {
    console.log(`  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}  ${a.subject.name.padEnd(20)} Teacher: ${a.teacher?.name ?? "none"}`);
  }
}

await p.$disconnect();
