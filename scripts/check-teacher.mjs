import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const name = process.argv[2] ?? "Irlanda";

const teacher = await p.teacher.findFirst({
  where: { name: { contains: name } },
});
if (!teacher) { console.log(`Teacher not found: ${name}`); await p.$disconnect(); process.exit(); }
console.log(`Teacher: ${teacher.name} (id: ${teacher.id})`);

const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, subject: true, timeBlock: true, room: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

const days = ["", "MON", "TUE", "WED", "THU", "FRI"];
console.log(`\nAssignments (${asgns.length}):`);
for (const a of asgns) {
  console.log(`  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime}  Grade ${a.grade.name}${a.grade.section ?? ""}  ${a.subject.name}  Room: ${a.room?.name ?? "-"}`);
}

await p.$disconnect();
