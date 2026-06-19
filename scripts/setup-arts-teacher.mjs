import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Arts teacher (TBD - Art)
let teacher = await p.teacher.findFirst({ where: { name: { contains: "TBD - Art" } } });
if (!teacher) {
  console.log("⚠️  Art teacher not found. Run create-art-teacher.mjs first");
  process.exit(1);
}

const artsSubject = await p.subject.findFirst({ where: { name: "Art" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", artsSubject?.name);

// Clear all non-homeroom assignments
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Middle School (grades 6-9) uses SECONDARY for morning, LOW_SECONDARY for afternoon
const getTB = (day, startTime) => {
  const MORNING_SLOTS = ["07:30", "08:30", "09:15", "09:45", "10:45", "11:45"];
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
    data: { teacherId: teacher.id, subjectId: artsSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Art${note ? " (" + note + ")" : ""}`);
};

// TUESDAY (day 2)
await create(2, "08:30", "6", "A");
await create(2, "09:45", "7", "A");
await create(2, "10:45", "7", "B");
await create(2, "11:45", "8", "A");
await create(2, "13:15", "8", "B");
await create(2, "14:15", "6", "B");

console.log("\n✅ Arts teacher schedule complete!");
await p.$disconnect();
