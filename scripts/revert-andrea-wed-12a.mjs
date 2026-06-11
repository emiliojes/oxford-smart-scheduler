import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const vielka = await p.teacher.findFirst({ where: { name: { contains: "Vielka" } } });
const grade12A = await p.grade.findFirst({ where: { name: "12", section: "A" } });
const english = await p.subject.findFirst({ where: { name: "English" } });
const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: 3, startTime: "14:15", blockType: "CLASS" } });

const asgn = await p.assignment.findFirst({ where: { gradeId: grade12A.id, timeBlockId: tb.id } });
if (asgn) {
  await p.assignment.update({ where: { id: asgn.id }, data: { teacherId: vielka.id, subjectId: english.id } });
  console.log(`Reverted WED 14:15 12A → English / Vielka Vega`);
}
await p.$disconnect();
