import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Deyanira
let teacher = await p.teacher.findFirst({ where: { name: { contains: "Deyanira" } } });
if (!teacher) {
  console.log("⚠️  Deyanira not found. Run create-deyanira.mjs first");
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

// Kindergarten (KA, KB, KC) uses SECONDARY timeblocks
// Grade 1 (1A, 1B, 1C) uses PRIMARY timeblocks
const getTB = (day, startTime, gradeName) => {
  const isKindergarten = gradeName === "KA" || gradeName === "KB" || gradeName === "KC" || gradeName === "K";
  
  if (isKindergarten) {
    // Kindergarten uses SECONDARY blocks
    return p.timeBlock.findFirst({
      where: { dayOfWeek: day, startTime, level: { in: ["SECONDARY", "BOTH"] }, blockType: "CLASS" },
    });
  } else {
    // Grade 1 uses PRIMARY blocks
    return p.timeBlock.findFirst({
      where: { dayOfWeek: day, startTime, level: { in: ["PRIMARY", "BOTH"] }, blockType: "CLASS" },
    });
  }
};

const create = async (day, startTime, gradeName, gradeSection, note = null) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime, gradeName);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day} ${startTime}`); return; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: spanishSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Spanish${note ? " (" + note + ")" : ""}`);
};

// MONDAY (day 1)
await create(1, "08:00", "1", "C");
await create(1, "09:15", "K", "A", "9:15-10:00");
await create(1, "10:15", "1", "A");
await create(1, "11:15", "K", "B");
await create(1, "12:30", "K", "C", "12:30-1:15");

// TUESDAY (day 2)
await create(2, "07:30", "1", "A");
await create(2, "09:15", "K", "C");
await create(2, "10:15", "1", "B");
await create(2, "11:15", "K", "A");
await create(2, "12:30", "K", "B");

// WEDNESDAY (day 3)
await create(3, "07:30", "1", "A");
await create(3, "09:15", "1", "B");
await create(3, "10:15", "1", "C");
await create(3, "11:15", "K", "A");
await create(3, "12:30", "K", "B", "12:30-1:30");

// THURSDAY (day 4)
await create(4, "07:30", "K", "A");
await create(4, "09:15", "1", "B");
await create(4, "10:15", "K", "B");
await create(4, "11:15", "1", "C");
await create(4, "12:30", "K", "C", "12:30-1:30");

// FRIDAY (day 5)
await create(5, "07:30", "1", "C");
await create(5, "09:15", "1", "B");
await create(5, "10:15", "K", "C", "10:15-11:00");
await create(5, "11:15", "1", "A");

console.log("\n✅ Deyanira schedule complete!");
await p.$disconnect();
