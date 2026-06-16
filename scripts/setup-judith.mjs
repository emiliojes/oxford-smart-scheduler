import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Judith" } } });
console.log("Teacher:", teacher?.name, teacher?.id);

// Get subject - Literature
const litSubject = await p.subject.findFirst({ where: { name: { contains: "Literature" } } });
console.log("Subject Literature:", litSubject?.name, litSubject?.id);

// Get room 14
const room = await p.room.findFirst({ where: { name: { contains: "14" } } });
console.log("Room:", room?.name, room?.id);

// Helper: find grade
const getGrade = async (name, section) => {
  return p.grade.findFirst({ where: { name, section: section ?? null } });
};

// Helper: find timeblock for HIGH secondary
const getTB = async (day, startTime) => {
  const tb = await p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime, level: { in: ["SECONDARY", "BOTH"] } },
  });
  if (!tb) console.warn(`  ⚠️  No SECONDARY timeblock found for day ${day} ${startTime}`);
  return tb;
};

// All assignments from the image (only class slots — no homeroom duplication)
// Format: [day, startTime, gradeName, gradeSection]
// Day: 1=MON 2=TUE 3=WED 4=THU 5=FRI
const slots = [
  // MON
  [1, "08:30", "9",  "A"],
  [1, "09:45", "10", "A"],
  [1, "11:45", "10", "B"],
  [1, "13:15", "9",  "B"],
  [1, "14:15", "11", "A"],
  // TUE
  [2, "07:30", "9",  "A"],
  [2, "08:30", "10", "B"],
  [2, "10:45", "8",  "A"],
  [2, "11:45", "12", "A"],
  [2, "13:15", "11", "B"],
  [2, "14:15", "10", "A"],
  // WED
  [3, "08:30", "11", "B"],
  [3, "09:45", "8",  "A"],
  [3, "10:45", "9",  "B"],
  [3, "11:45", "12", "A"],  // "12AQ" in image — section A
  [3, "13:15", "11", "A"],
  [3, "14:15", "10", "B"],
  // THU
  [4, "08:30", "10", "A"],
  [4, "09:45", "9",  "A"],
  [4, "11:45", "12", null], // "12" — no section shown, try without section first
  [4, "13:15", "9",  "B"],
  // FRI
  [5, "07:30", "11", "B"],  // wait — image shows TUE 07:30 = 9A, checking again...
  [5, "08:30", "11", "B"],
  [5, "11:45", "8",  "A"],
  [5, "13:15", "11", "A"],  // 1:15 row
  [5, "14:15", "11", "A"],  // 2:15 row
];

// Re-read image carefully:
// MON: Homeroom(done), 9A, 10A, [10:45 empty], 10B, LUNCH, 9B, 11A
// TUE: 9A, 10B, [empty], 8A, 12A, LUNCH, 11B, 10A
// WED: 11B, 8A, 9B, 12AQ, LUNCH, 11A, 10B
// THU: 10A, 9A, [empty], 12, LUNCH/supervision, 9B, [empty]  -- 2:15=empty
// FRI: [empty 7:30], 11B, [empty 9:45], 8A, LUNCH/student dismissal, [1:15 empty], 11A

const slotsClean = [
  // MON
  [1, "08:30", "9",  "A"],
  [1, "09:45", "10", "A"],
  [1, "11:45", "10", "B"],
  [1, "13:15", "9",  "B"],
  [1, "14:15", "11", "A"],
  // TUE
  [2, "07:30", "9",  "A"],
  [2, "08:30", "10", "B"],
  [2, "10:45", "8",  "A"],
  [2, "11:45", "12", "A"],
  [2, "13:15", "11", "B"],
  [2, "14:15", "10", "A"],
  // WED
  [3, "08:30", "11", "B"],
  [3, "09:45", "8",  "A"],
  [3, "10:45", "9",  "B"],
  [3, "11:45", "12", "A"],
  [3, "13:15", "11", "A"],
  [3, "14:15", "10", "B"],
  // THU
  [4, "08:30", "10", "A"],
  [4, "09:45", "9",  "A"],
  [4, "11:45", "12", null],
  [4, "13:15", "9",  "B"],
  // FRI
  [5, "08:30", "11", "B"],
  [5, "11:45", "8",  "A"],
  [5, "14:15", "11", "A"],
];

let created = 0;
let skipped = 0;

for (const [day, startTime, gradeName, gradeSection] of slotsClean) {
  const grade = await getGrade(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection??""}`); skipped++; continue; }

  const tb = await getTB(day, startTime);
  if (!tb) { skipped++; continue; }

  // Check if already exists
  const existing = await p.assignment.findFirst({
    where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id },
  });
  if (existing) {
    console.log(`  ✓ Skip (exists): Day${day} ${startTime} ${gradeName}${gradeSection??""}`);
    skipped++;
    continue;
  }

  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: litSubject.id,
      gradeId: grade.id,
      roomId: room?.id ?? null,
      timeBlockId: tb.id,
      status: "CONFIRMED",
    },
  });
  console.log(`  ✅ Created: Day${day} ${startTime} Grade ${gradeName}${gradeSection??""} Literature`);
  created++;
}

console.log(`\nDone: ${created} created, ${skipped} skipped`);
await p.$disconnect();
