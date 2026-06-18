import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Vanessa" } } });
const homeroomSubject = await p.subject.findFirst({ where: { name: "Homeroom" } });
const grade10A = await p.grade.findFirst({ where: { name: "10", section: "A" } });
const timeblock = await p.timeBlock.findFirst({
  where: { dayOfWeek: 1, startTime: "07:30", level: { in: ["SECONDARY", "BOTH"] }, blockType: "CLASS" },
});

console.log("Teacher:", teacher?.name);
console.log("Subject:", homeroomSubject?.name);
console.log("Grade:", grade10A?.name + grade10A?.section);
console.log("Timeblock:", timeblock?.startTime + "-" + timeblock?.endTime);

// Check if homeroom already exists
const existing = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subjectId: homeroomSubject.id, gradeId: grade10A.id, timeBlockId: timeblock.id },
});

if (existing) {
  console.log("\n✓ Homeroom already exists");
} else {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: homeroomSubject.id,
      gradeId: grade10A.id,
      roomId: null,
      timeBlockId: timeblock.id,
      status: "CONFIRMED",
    },
  });
  console.log("\n✅ Created Homeroom 10A for Vanessa on MON 7:30-8:30");
}

await p.$disconnect();
