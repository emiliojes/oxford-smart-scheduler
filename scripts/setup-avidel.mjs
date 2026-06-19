import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Avidel
let teacher = await p.teacher.findFirst({ where: { name: { contains: "Avidel" } } });
if (!teacher) {
  console.log("⚠️  Avidel not found. Run create-avidel.mjs first");
  process.exit(1);
}

const spanishSubject = await p.subject.findFirst({ where: { name: "Spanish" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", spanishSubject?.name);

// Clear all assignments
await p.assignment.deleteMany({
  where: { teacherId: teacher.id },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Grades 2-3 use PRIMARY timeblocks
const getTB = (day, startTime) => {
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime, level: { in: ["PRIMARY", "BOTH"] }, blockType: "CLASS" },
  });
};

const create = async (day, startTime, gradeName, gradeSection, note = null) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day} ${startTime}`); return; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: spanishSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Spanish${note ? " (" + note + ")" : ""}`);
};

// MONDAY (day 1)
await create(1, "09:15", "2", "C");
await create(1, "10:15", "2", "B");
await create(1, "11:15", "2", "A");
await create(1, "12:30", "3", "A");

// TUESDAY (day 2)
await create(2, "07:30", "2", "B");
await create(2, "10:15", "2", "A");
await create(2, "11:15", "3", "B");
await create(2, "12:30", "2", "C", "12:30-1:30");

// WEDNESDAY (day 3)
await create(3, "07:30", "2", "B");
await create(3, "10:15", "2", "A");
await create(3, "11:15", "3", "A");
await create(3, "12:30", "3", "B");

// THURSDAY (day 4)
await create(4, "07:30", "2", "A");
await create(4, "09:15", "3", "B");
await create(4, "10:15", "2", "C");
await create(4, "11:15", "3", "A");
await create(4, "12:30", "2", "B");

// FRIDAY (day 5)
await create(5, "07:30", "2", "C", "7:30-8:00");
await create(5, "10:15", "3", "A", "10:15-11:15");
await create(5, "11:15", "3", "B", "11:45-12:30");

console.log("\n✅ Avidel schedule complete!");
await p.$disconnect();
