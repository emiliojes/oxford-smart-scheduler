import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Science Lab Assistant
let teacher = await p.teacher.findFirst({ where: { name: { contains: "Science Lab Assistant" } } });
if (!teacher) {
  console.log("⚠️  Science Lab Assistant not found. Run create-science-assistant.mjs first");
  process.exit(1);
}

const scienceSubject = await p.subject.findFirst({ where: { name: "Science" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", scienceSubject?.name);

// Clear all assignments
await p.assignment.deleteMany({
  where: { teacherId: teacher.id },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// High School (grades 9-12) and Middle School (6-8) use SECONDARY for morning, LOW_SECONDARY for afternoon
const getTB = (day, startTime) => {
  const MORNING_SLOTS = ["07:30", "08:30", "09:45", "10:45", "11:45"];
  const isMorning = MORNING_SLOTS.includes(startTime);
  const levels = isMorning ? ["SECONDARY", "BOTH"] : ["LOW_SECONDARY", "BOTH"];
  
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime, level: { in: levels }, blockType: "CLASS" },
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
    data: { teacherId: teacher.id, subjectId: scienceSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Science${note ? " (" + note + ")" : ""}`);
};

// MONDAY (day 1)
await create(1, "08:30", "11", "B", "CHEM 11 B");
await create(1, "09:45", "6", "B");
await create(1, "10:45", "7", "A", "A7");
await create(1, "11:45", "10", "A", "CHEM 10A");
await create(1, "13:15", "6", "A");
await create(1, "14:15", "7", "A");

// TUESDAY (day 2)
await create(2, "07:30", "6", "A");
await create(2, "08:30", "7", "A", "A7");
await create(2, "10:45", "7", "A");
await create(2, "11:45", "11", "B", "BIO 11B");
await create(2, "13:15", "6", "B");

console.log("\n✅ Science Lab Assistant schedule complete!");
await p.$disconnect();
