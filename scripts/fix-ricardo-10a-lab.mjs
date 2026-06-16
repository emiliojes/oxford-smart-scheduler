import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Ricardo Ferran
const teacher = await p.teacher.findFirst({ where: { name: { contains: "Ricardo" } } });
console.log("Teacher:", teacher?.name, teacher?.id);

// Find grade 10A
const grade = await p.grade.findFirst({ where: { name: "10", section: "A" } });
console.log("Grade:", grade?.name, grade?.section, grade?.id);

// Find the assignment on Friday (day 5) at 14:15 with note LAB for 10A
const asgn = await p.assignment.findFirst({
  where: {
    teacherId: teacher?.id,
    gradeId: grade?.id,
    note: { contains: "LAB" },
    timeBlock: { dayOfWeek: 5, startTime: "14:15" },
  },
  include: { timeBlock: true, subject: true },
});
console.log("Assignment to move:", asgn?.id, asgn?.timeBlock?.dayOfWeek, asgn?.timeBlock?.startTime, asgn?.subject?.name, asgn?.note);

// Find Thursday (day 4) timeblock at 14:15
const thursdayBlock = await p.timeBlock.findFirst({
  where: { dayOfWeek: 4, startTime: "14:15" },
});
console.log("Thursday block:", thursdayBlock?.id, thursdayBlock?.dayOfWeek, thursdayBlock?.startTime);

if (asgn && thursdayBlock) {
  const updated = await p.assignment.update({
    where: { id: asgn.id },
    data: { timeBlockId: thursdayBlock.id },
  });
  console.log("✅ Moved to Thursday:", updated.id);
} else {
  console.log("❌ Could not find assignment or Thursday block");
}

await p.$disconnect();
