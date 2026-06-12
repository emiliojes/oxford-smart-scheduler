import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });
const conrado = await p.teacher.findFirst({ where: { name: { contains: "Conrado" } } });
const grade12A = await p.grade.findFirst({ where: { name: "12", section: "A" } });
const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: 3, startTime: "14:15", blockType: "CLASS" } });

const asgn = await p.assignment.findFirst({
  where: { teacherId: andrea.id, gradeId: grade12A.id, timeBlockId: tb.id },
});
if (asgn) {
  await p.assignment.update({ where: { id: asgn.id }, data: { teacherId: conrado.id } });
  console.log("WED 14:15 12A → reverted to Conrado");
} else {
  console.log("Not found");
}
await p.$disconnect();
