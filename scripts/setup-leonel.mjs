import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Leonel" } } });
const englishSubject = await p.subject.findFirst({ where: { name: "English" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", englishSubject?.name);

// Clear all non-homeroom assignments
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Grade 9 is Middle, uses SECONDARY for morning (07:30, 08:30, 09:45)
const getTB = (day, startTime) => p.timeBlock.findFirst({
  where: { dayOfWeek: day, startTime, level: { in: ["SECONDARY", "BOTH"] }, blockType: "CLASS" },
});

const create = async (day, startTime, gradeName, gradeSection) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day} ${startTime}`); return; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: englishSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED" },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} English`);
};

// MON
await create(1, "08:30", "9", "B");
await create(1, "09:45", "9", "A");

// TUE
await create(2, "07:30", "9", "B");
await create(2, "08:30", "9", "A");

// WED
await create(3, "07:30", "9", "B");
await create(3, "08:30", "9", "A");

// THU
await create(4, "07:30", "9", "A");
await create(4, "08:30", "9", "B");

// FRI
await create(5, "07:30", "9", "A");
await create(5, "08:30", "9", "B");

console.log("\nDone.");
await p.$disconnect();
