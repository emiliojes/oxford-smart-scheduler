import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Adolfo" } } });
const musicSubject = await p.subject.findFirst({ where: { name: "Music" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", musicSubject?.name);
console.log("\nAdding WED-FRI assignments...\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Mixed Primary + Middle
// Primary uses PRIMARY timeblocks, Middle uses SECONDARY (morning) and LOW_SECONDARY (afternoon)
// Exception: KA/KB/KC use SECONDARY timeblocks
const getTB = (day, startTime, gradeName) => {
  const gradeNum = parseInt(gradeName);
  const isKindergarten = gradeName === "KA" || gradeName === "KB" || gradeName === "KC";
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

// WED (day 3)
await create(3, "07:30", "4", "B");
await create(3, "09:15", "3", "A");
await create(3, "10:15", "1", "B");
await create(3, "12:45", "5", "B", "12:45-1:50");  // Note: 12:45-1:50

// THU (day 4)
await create(4, "07:30", "1", "C");
await create(4, "09:15", "K", "B");  // KB = Kindergarten B
await create(4, "10:15", "K", "C");  // KC = Kindergarten C
await create(4, "11:45", "6", "B");
await create(4, "12:45", "3", "B", "12:45-1:50");  // Note: 12:45-1:50

// FRI (day 5)
await create(5, "09:15", "2", "C");
await create(5, "10:15", "5", "A");

console.log("\n✅ Part 2 done (WED-FRI). Adolfo schedule complete!");
await p.$disconnect();
