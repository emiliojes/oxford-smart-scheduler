import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const grades12 = await p.grade.findMany({ where: { name: "12" } });
console.log("Grade 12 options:", grades12.map(g => `${g.name}${g.section??""} (${g.level})`));

// THU 11:45 — the image shows "12" which is likely 12A (only one grade 12)
// Pick the first one
const grade = grades12[0];
const teacher = await p.teacher.findFirst({ where: { name: { contains: "Judith" } } });
const subject = await p.subject.findFirst({ where: { name: { contains: "Literature" } } });
const room = await p.room.findFirst({ where: { name: { contains: "14" } } });
const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: 4, startTime: "11:45", level: { in: ["SECONDARY","BOTH"] } } });

console.log("Grade:", grade?.name, grade?.section);
console.log("TB:", tb?.startTime, tb?.endTime);

if (grade && tb) {
  const existing = await p.assignment.findFirst({
    where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id },
  });
  if (existing) {
    console.log("Already exists");
  } else {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: subject.id,
        gradeId: grade.id,
        roomId: room?.id ?? null,
        timeBlockId: tb.id,
        status: "CONFIRMED",
      },
    });
    console.log(`✅ Created THU 11:45 Grade ${grade.name}${grade.section??""} Literature`);
  }
}

await p.$disconnect();
