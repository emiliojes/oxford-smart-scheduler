import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check WED 14:15 for grade 12A
const grade12A = await p.grade.findFirst({ where: { name: "12", section: "A" } });
const asgns = await p.assignment.findMany({
  where: { gradeId: grade12A.id, timeBlock: { dayOfWeek: 3, startTime: "14:15" } },
  include: { subject: true, teacher: true, timeBlock: true },
});
console.log("WED 14:15 Grade 12A:");
asgns.forEach(a => console.log(`  ${a.subject.name}  Teacher: ${a.teacher?.name}  id: ${a.id}`));

await p.$disconnect();
