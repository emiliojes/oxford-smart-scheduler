import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Enis" } } });
const englishSubject = await p.subject.findFirst({ where: { name: "English" } });
const litSubject = await p.subject.findFirst({ where: { name: "Literature" } });
const room08 = await p.room.findFirst({ where: { name: { contains: "08" } } });

console.log("Teacher:", teacher?.name);
console.log("English:", englishSubject?.name);
console.log("Literature:", litSubject?.name);
console.log("Room:", room08?.name);

// Clear all non-homeroom assignments
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Morning slots (07:30, 08:30, 09:45) are SECONDARY (shared), afternoon slots are LOW_SECONDARY
// 11:45 is HIGH only, map to 12:00 for Middle grades
const MORNING_SLOTS = ["07:30", "08:30", "09:45"];
const getTB = (day, startTime) => {
  // Map 11:45 → 12:00 for Middle grades (11:45 doesn't exist in LOW_SECONDARY)
  const mappedTime = startTime === "11:45" ? "12:00" : startTime;
  const isMorning = MORNING_SLOTS.includes(mappedTime);
  const levels = isMorning ? ["SECONDARY", "BOTH"] : ["LOW_SECONDARY", "BOTH"];
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime: mappedTime, level: { in: levels }, blockType: "CLASS" },
  });
};

const create = async (day, startTime, gradeName, gradeSection, subject, note = null) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day}`); return; }
  const subjectId = subject === "ENG" ? englishSubject.id : litSubject.id;
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId, gradeId: grade.id, roomId: room08?.id ?? null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} ${subject}${note ? " (" + note + ")" : ""}`);
};

// MON: 8B LIT(8:30), 7A LIT(9:45), 7B LIT(10:45), 8B ENG(11:45), 8B LIT(13:00), 8A ENG(14:00)
await create(1, "08:30", "8", "B", "LIT");
await create(1, "09:45", "7", "A", "LIT");
await create(1, "10:45", "7", "B", "LIT");
await create(1, "11:45", "8", "B", "ENG");
await create(1, "13:00", "8", "B", "LIT", "1:15");
await create(1, "14:00", "8", "A", "ENG", "2:15");

// TUE: 8B LIT(7:30), 7B LIT(8:30), 6A LIT(10:45), 6B LIT(11:45), 8A ENG(13:00), 8A ENG(14:00) - duplicate!
await create(2, "07:30", "8", "B", "LIT");
await create(2, "08:30", "7", "B", "LIT");
await create(2, "10:45", "6", "A", "LIT");
await create(2, "11:45", "6", "B", "LIT");
await create(2, "13:00", "8", "A", "ENG", "1:15");
await create(2, "14:00", "8", "A", "ENG", "2:15 - duplicate");

// WED: 6A LIT(7:30), 7B LIT(8:30 - conflict!), 7B LIT(9:45 - conflict!), 8B ENG(10:45), 7A LIT(11:45), 8A ENG(13:00), 6B LIT(14:00)
await create(3, "07:30", "6", "A", "LIT");
await create(3, "08:30", "7", "B", "LIT", "8:30 - conflict");
await create(3, "09:45", "7", "B", "LIT", "9:45 - conflict");
await create(3, "10:45", "8", "B", "ENG");
await create(3, "11:45", "7", "A", "LIT");
await create(3, "13:00", "8", "A", "ENG");
await create(3, "14:00", "6", "B", "LIT");

// THU: 8B LIT(7:30), 7A LIT(8:30), 8A ENG(10:45), 6A LIT(11:45), 8B ENG(14:00)
await create(4, "07:30", "8", "B", "LIT");
await create(4, "08:30", "7", "A", "LIT");
await create(4, "10:45", "8", "A", "ENG");
await create(4, "11:45", "6", "A", "LIT");
await create(4, "14:00", "8", "B", "ENG");

// FRI: 8A ENG(9:45), 8B ENG(10:45), 6B LIT(11:45), 8B ENG(11:45)? wait, image shows 6B LIT at 11:45
// Actually FRI: 8A ENG(9:45), 8B ENG(10:45), 8B ENG(11:45), 6B LIT(11:45?) - need to re-read
// FRI row: 9:45=8A ENG, 10:45=8B ENG, 11:45=6B LIT (or 8B?), Student dismissal
// Let me check: image shows 8B ENG at 10:45, then 6B LIT at 11:45, Student dismissal at bottom
await create(5, "09:45", "8", "A", "ENG");
await create(5, "10:45", "8", "B", "ENG");
await create(5, "11:45", "6", "B", "LIT");

console.log("\nDone.");
await p.$disconnect();
