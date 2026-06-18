import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Arlex" } } });
const englishSubject = await p.subject.findFirst({ where: { name: "English" } });

console.log("Teacher:", teacher?.name);
console.log("English:", englishSubject?.name);

// Clear all non-homeroom assignments
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// All High School grades use SECONDARY timeblocks
// Map afternoon slots: 13:00->13:15, 14:00->14:15 (SECONDARY afternoon uses 13:15 and 14:15)
const getTB = (day, startTime) => {
  const mappedTime = startTime === "13:00" ? "13:15" : startTime === "14:00" ? "14:15" : startTime;
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime: mappedTime, level: { in: ["SECONDARY", "BOTH"] }, blockType: "CLASS" },
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
    data: { teacherId: teacher.id, subjectId: englishSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} English${note ? " (" + note + ")" : ""}`);
};

// Image shows:
// MON: 9:45 XI B, 11:45 XII
// TUE: 9:45 XA, 10:45 XI B, 11:45 XI A
// WED: 9:45 XB, 10:45 XA, 11:45 XIA, 13:00 XIB, 14:00 XIIA
// THU: 9:45 XB, 11:45 XIA, 13:00 XIB, 14:00 XIIA
// FRI: 7:30 XB (Student Arrival Duty), 9:45 XA, 10:45 XA

// Note: X = 10, XI = 11, XII = 12

// MON
await create(1, "09:45", "11", "B");  // XI B
await create(1, "11:45", "12", "A"); // XII A

// TUE
await create(2, "09:45", "10", "A");  // XA
await create(2, "10:45", "11", "B");  // XI B
await create(2, "11:45", "11", "A");  // XI A

// WED
await create(3, "09:45", "10", "B");  // XB
await create(3, "10:45", "10", "A");  // XA
await create(3, "11:45", "11", "A");  // XIA
await create(3, "13:00", "11", "B");  // XIB
await create(3, "14:00", "12", "A");  // XIIA

// THU
await create(4, "09:45", "10", "B");  // XB
await create(4, "11:45", "11", "A");  // XIA
await create(4, "13:00", "11", "B");  // XIB
await create(4, "14:00", "12", "A");  // XIIA

// FRI
await create(5, "07:30", "10", "B");  // XB (7:30-8:30)
await create(5, "09:45", "10", "A");  // XA
await create(5, "10:45", "10", "A");  // XA (appears in red - likely conflict/duplicate)

console.log("\nDone.");
await p.$disconnect();
