import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Adolfo" } } });
const musicSubject = await p.subject.findFirst({ where: { name: "Music" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", musicSubject?.name);

// Clear all non-homeroom assignments
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Mixed Primary + Middle
// Primary uses PRIMARY timeblocks, Middle uses SECONDARY (morning) and LOW_SECONDARY (afternoon)
// Exception: KA/KB use SECONDARY timeblocks
const getTB = (day, startTime, gradeName) => {
  const gradeNum = parseInt(gradeName);
  const isKindergarten = gradeName === "KA" || gradeName === "KB";
  const isPrimary = gradeNum <= 5 && !isKindergarten;
  const isMiddle = gradeNum >= 6 && gradeNum <= 9;
  
  // Primary uses PRIMARY timeblocks (but not Kindergarten)
  if (isPrimary) {
    return p.timeBlock.findFirst({
      where: { dayOfWeek: day, startTime, level: { in: ["PRIMARY", "BOTH"] }, blockType: "CLASS" },
    });
  }
  
  // Middle uses SECONDARY for morning, LOW_SECONDARY for afternoon
  const MORNING_SLOTS = ["07:30", "08:30", "09:15", "10:15", "10:45", "11:45"];
  const isMorning = MORNING_SLOTS.includes(startTime);
  const levels = isMorning ? ["SECONDARY", "BOTH"] : ["LOW_SECONDARY", "BOTH"];
  
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime, level: { in: levels }, blockType: "CLASS" },
  });
};

const create = async (day, startTime, gradeName, gradeSection, note = null) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime, gradeName);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day} ${startTime}`); return; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: musicSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Music${note ? " (" + note + ")" : ""}`);
};

// MON
await create(1, "07:30", "2", "A");
await create(1, "09:15", "2", "B");
await create(1, "10:15", "4", "A");
await create(1, "10:45", "8", "B");
await create(1, "11:45", "6", "A");
await create(1, "13:00", "8", "A");

// TUE
await create(2, "07:30", "2", "A");
await create(2, "09:15", "K", "A");  // KA = Kindergarten A
await create(2, "10:15", "4", "A");
await create(2, "11:45", "7", "B");
await create(2, "13:00", "7", "A", "1:15-2:15");  // Note in parentheses

console.log("\nPart 1 done (MON-TUE). Continue with remaining days.");
await p.$disconnect();
