import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Maria" } } });
const subject  = await p.subject.findFirst({ where: { name: "Spanish" } });
const room16   = await p.room.findFirst({ where: { name: { contains: "16" } } });

console.log("Teacher:", teacher?.name);
console.log("Room:", room16?.name);

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Timeblock helper — grade 7,8 afternoon = LOW_SECONDARY; grade 10 = SECONDARY; morning shared = SECONDARY
const getTB = async (day, startTime, gradeNum) => {
  const isMiddleAfternoon = [7, 8].includes(gradeNum) && ["10:45","12:00","13:00","14:00"].includes(startTime);
  const levels = isMiddleAfternoon ? ["LOW_SECONDARY","BOTH"] : ["SECONDARY","BOTH"];
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) console.warn(`  ⚠️  No TB: day${day} ${startTime} grade${gradeNum}`);
  return tb;
};

// Image slots — [day, startTime, gradeName, gradeSection, gradeNum]
// MON: Homeroom(7B done), 8A(8:30), 10B(9:45), [10:45 empty], 7A(11:45→HIGH slot but grade7=MID→12:00), LUNCH, 7B(1:15→13:00MID), 10B(2:15→14:15HIGH)
// Note: 11:45 = HIGH slot. For grade 7 (Middle) → use 12:00 LOW_SECONDARY instead
// 1:15 = 13:15 HIGH or 13:00 LOW depending on grade

const slots = [
  // MON
  [1, "08:30", "8", "A", 8],
  [1, "09:45", "10","B", 10],
  [1, "12:00", "7", "A", 7],   // 11:45 in image → LOW_SECONDARY 12:00 for grade 7
  [1, "13:00", "7", "B", 7],   // 1:15 → 13:00 LOW_SECONDARY for grade 7
  [1, "14:15", "10","B", 10],  // 2:15 → 14:15 HIGH for grade 10
  // TUE
  [2, "09:45", "8", "A", 8],
  [2, "10:45", "10","A", 10],  // 10:45-11:45 HIGH slot for grade 10 ✅
  [2, "11:45", "7", "A", 7],   // 11:45 HIGH... but grade 7 is MIDDLE → use LOW_SECONDARY 12:00? 
  // Wait — 11:45 in image for grade 7A on TUE. Grade 7 is MIDDLE, no 11:45 slot exists in LOW_SECONDARY
  // → use 12:00 LOW_SECONDARY
  [2, "13:00", "7", "B", 7],   // 1:15 = 13:00 LOW for grade 7
  [2, "14:15", "10","A", 10],  // 2:15 = 14:15 HIGH
  // WED
  [3, "08:30", "7", "A", 7],
  [3, "10:45", "8", "A", 8],   // 10:45 LOW_SECONDARY for grade 8
  [3, "11:45", "7", "B", 7],   // → 12:00 LOW_SECONDARY
  [3, "13:00", "10","B", 10],  // wait — 1:15 for grade 10 = 13:15 HIGH
  [3, "14:15", "10","A", 10],  // 2:15 = 14:15 HIGH
  // THU
  [4, "08:30", "7", "B", 7],
  [4, "09:45", "10","A", 10],  // but image says empty THU 9:45? Re-check
  [4, "10:45", "10","B", 10],  // 10:45-11:45 HIGH
  [4, "11:45", "8", "A", 8],   // 11:45 HIGH slot... grade 8 MIDDLE → use 12:00 LOW
  [4, "13:15", "7", "A", 7],   // 1:15 = 13:00 LOW for grade 7... but image shows 7A
  // FRI
  [5, "07:30", "8", "A", 5],   // 7:30 → SECONDARY shared
  [5, "08:30", "7", "B", 7],
  [5, "09:45", "7", "A", 7],
  [5, "10:45", "10","A", 10],  // 10:45 HIGH, but also /7B shown → split? 10A/7B means two in same cell?
  // Image shows "10A /7B" at FRI 10:45 — two grades? This is likely a conflict in official schedule
  // Load both:
  [5, "10:45", "7", "B", 7],   // 7B → LOW_SECONDARY 10:45
  [5, "11:45", "10","A", 10],  // FRI 11:45 → HIGH (shown in orange = conflict?)
];

// Re-reading image carefully:
// MON: Homeroom, 8A(8:30), 10B(9:45), [10:45 empty], 7A(11:45), LUNCH, 7B(1:15), 10B(2:15)
// TUE: [7:30 empty], 8A(wait no — TUE 8:30 shows nothing... re-read)
// TUE: [7:30 empty], [8:30 empty], 8A(9:45), 10A(10:45), 7A(11:45), LUNCH/cafeteria, 7B(1:15), 10A(2:15)
// WED: [7:30 empty], 7A(8:30), [9:45 empty], 8A(10:45), 7B(11:45), LUNCH, 10B(1:15), 10A(2:15)
// THU: [7:30 empty], 7B(8:30), [9:45 empty?], 10B(10:45), 8A(11:45), LUNCH, 7A(1:15), [2:15 empty]
// FRI: 8A(7:30), 7B(8:30), 7A(9:45), 10A/7B(10:45), 10A(11:45→orange), Student dismissal

const slotsClean = [
  // MON
  [1, "08:30", "8", "A", 8],
  [1, "09:45", "10","B", 10],
  [1, "12:00", "7", "A", 7],   // 11:45 → LOW_SECONDARY 12:00 for grade 7
  [1, "13:00", "7", "B", 7],
  [1, "14:15", "10","B", 10],
  // TUE
  [2, "09:45", "8", "A", 8],
  [2, "10:45", "10","A", 10],
  [2, "12:00", "7", "A", 7],   // 11:45 → 12:00 LOW for grade 7
  [2, "13:00", "7", "B", 7],
  [2, "14:15", "10","A", 10],
  // WED
  [3, "08:30", "7", "A", 7],
  [3, "10:45", "8", "A", 8],   // LOW_SECONDARY
  [3, "12:00", "7", "B", 7],   // 11:45 → 12:00 LOW
  [3, "13:15", "10","B", 10],  // 1:15 HIGH
  [3, "14:15", "10","A", 10],
  // THU
  [4, "08:30", "7", "B", 7],
  [4, "10:45", "10","B", 10],
  [4, "12:00", "8", "A", 8],   // 11:45 → 12:00 LOW for grade 8
  [4, "13:00", "7", "A", 7],   // 1:15 LOW for grade 7
  // FRI
  [5, "07:30", "8", "A", 8],
  [5, "08:30", "7", "B", 7],
  [5, "09:45", "7", "A", 7],
  [5, "10:45", "10","A", 10],  // HIGH 10:45
  [5, "10:45", "7", "B", 7],   // LOW 10:45 (conflict shown in official)
  [5, "11:45", "10","A", 10],  // HIGH 11:45 (shown orange = conflict with above?)
];

let created = 0;
for (const [day, startTime, gradeName, gradeSection, gradeNum] of slotsClean) {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection}`); continue; }
  const isMiddleAfternoon = [7,8].includes(gradeNum) && ["10:45","12:00","13:00","14:00"].includes(startTime);
  const levels = isMiddleAfternoon ? ["LOW_SECONDARY","BOTH"] : ["SECONDARY","BOTH"];
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) { console.warn(`  ⚠️  No TB: day${day} ${startTime} grade${gradeNum}`); continue; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: Day${day} ${startTime} ${gradeName}${gradeSection}`); continue; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: subject.id, gradeId: grade.id, roomId: room16?.id ?? null, timeBlockId: tb.id, status: "CONFIRMED" },
  });
  console.log(`  ✅ Day${day} ${startTime} Grade ${gradeName}${gradeSection} [${isMiddleAfternoon?"MID":"SEC"}]`);
  created++;
}

console.log(`\nDone: ${created} created`);
await p.$disconnect();
