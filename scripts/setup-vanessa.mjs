import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Vanessa" } } });
const socialSubject = await p.subject.findFirst({ where: { name: "Social Science" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", socialSubject?.name);

// Clear all non-homeroom assignments
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Mixed Middle (7,8,9) + High (10,11,12)
// Morning slots (07:30, 08:30, 09:45, 10:45) use SECONDARY (shared)
// 11:45 for Middle -> 12:00, for High -> 11:45
// Afternoon: Middle uses 12:00,13:00,14:00 (LOW_SECONDARY), High uses 13:15,14:15 (SECONDARY)
const MORNING_SLOTS = ["07:30", "08:30", "09:45", "10:45"];
const getTB = (day, startTime, gradeName, forceHighSlot = false) => {
  const gradeNum = parseInt(gradeName);
  const isMiddle = gradeNum >= 7 && gradeNum <= 9;
  const isHigh = gradeNum >= 10 && gradeNum <= 12;
  
  // Map 11:45 -> 12:00 for Middle, keep 11:45 for High (unless forceHighSlot)
  let mappedTime = startTime;
  if (startTime === "11:45" && isMiddle && !forceHighSlot) {
    mappedTime = "12:00";
  }
  // Map afternoon slots for High: 13:00->13:15, 14:00->14:15
  if (isHigh && startTime === "13:00") mappedTime = "13:15";
  if (isHigh && startTime === "14:00") mappedTime = "14:15";
  
  const isMorning = MORNING_SLOTS.includes(startTime) || startTime === "11:45";
  const levels = isMorning 
    ? ["SECONDARY", "BOTH"] 
    : isMiddle 
      ? ["LOW_SECONDARY", "BOTH"] 
      : ["SECONDARY", "BOTH"];
  
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime: mappedTime, level: { in: levels }, blockType: "CLASS" },
  });
};

const create = async (day, startTime, gradeName, gradeSection, note = null, forceHighSlot = false) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime, gradeName, forceHighSlot);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day} ${startTime}`); return; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: socialSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Social Sciences${note ? " (" + note + ")" : ""}`);
};

// Image shows:
// MON: 8A(7:30), 7B(8:30), 8A(9:45), 10A(10:45), 7A(13:00)
// TUE: 8A(7:30), 8B(8:30), 9A(9:45), 8B(10:45), 10B(11:45), 9B(13:00)
// WED: 7B(7:30), 10B(8:30), 12A(9:45), 7B(10:45), 11B(11:45), 7A(13:00)
// THU: 9B(7:30), 11A(8:30), 8A(9:45), 7A(10:45), 9A(11:45), 8B(13:00)
// FRI: 9B(7:30), 10A(8:30), 11B(9:45), 11A(10:45), 12A(11:45)

// MON
await create(1, "07:30", "8", "A");
await create(1, "08:30", "7", "B");
await create(1, "09:45", "8", "A");
await create(1, "10:45", "10", "A");
await create(1, "13:00", "7", "A");

// TUE
await create(2, "07:30", "8", "A");
await create(2, "08:30", "8", "B");
await create(2, "09:45", "9", "A");
await create(2, "10:45", "8", "B");
await create(2, "11:45", "10", "B");
await create(2, "13:00", "9", "B");

// WED
await create(3, "07:30", "7", "B");
await create(3, "08:30", "10", "B");
await create(3, "09:45", "12", "A");
await create(3, "10:45", "7", "B");
await create(3, "11:45", "11", "B");
await create(3, "13:00", "7", "A");

// THU
await create(4, "07:30", "9", "B");
await create(4, "08:30", "11", "A");
await create(4, "09:45", "8", "A");
await create(4, "10:45", "7", "A");
// 9A at 11:45 uses HIGH slot (exception - normally Middle would use 12:00)
await create(4, "11:45", "9", "A", null, true);  // forceHighSlot=true
await create(4, "13:00", "8", "B");

// FRI
await create(5, "07:30", "9", "B");
await create(5, "08:30", "10", "A");
await create(5, "09:45", "11", "B");
await create(5, "10:45", "11", "A");
await create(5, "11:45", "12", "A");

console.log("\nDone.");
await p.$disconnect();
