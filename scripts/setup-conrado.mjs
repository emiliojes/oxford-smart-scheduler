import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Conrado" } } });
console.log("Teacher:", teacher?.name);

const scienceSubject = await p.subject.findFirst({ where: { name: "Science" } });
const rrSubject = await p.subject.findFirst({ where: { name: { contains: "Resource Room" } } });
const room18 = await p.room.findFirst({ where: { name: { contains: "18" } } });

console.log("Science:", scienceSubject?.name, scienceSubject?.id);
console.log("Resource Room:", rrSubject?.name);
console.log("Room 18:", room18?.name);

// ── Step 1: Delete ALL existing assignments except Homeroom ──────────
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id } },
});
console.log("\n🗑️  Deleted all non-homeroom assignments");

// ── Step 2: Helper functions ─────────────────────────────────────────
const getGrade = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// For Middle (7,8): LOW_SECONDARY timeblocks; for High (9): SECONDARY
const getTB = async (day, startTime, gradeNum) => {
  const levels = [7, 8].includes(gradeNum)
    ? ["LOW_SECONDARY", "BOTH"]
    : ["SECONDARY", "BOTH"];
  const tb = await p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime, level: { in: levels } },
  });
  if (!tb) console.warn(`  ⚠️  No timeblock: day${day} ${startTime} grade${gradeNum}`);
  return tb;
};

// ── Step 3: Create all assignments from image ─────────────────────────
// [day, startTime, gradeName, gradeSection, gradeNum, subject, note]
const slots = [
  // MON
  [1, "08:30", "8", "B", 8, "science"],
  [1, "09:45", "7", "B", 7, "science"],
  [1, "10:45", "8", "A", 8, "science"],
  [1, "11:45", "7", "B", 7, "science"],
  [1, "14:15", "9", "A", 9, "science"],  // 2:15 row = 14:15 HIGH slot
  // TUE
  [2, "08:30", "8", "A", 8, "science"],
  [2, "09:45", "7", "B", 7, "science"],
  [2, "10:45", "9", "A", 9, "science"],
  [2, "11:45", "8", "B", 8, "science"],
  [2, "13:15", "rr", null, 0, "rr"],     // Resource Room Support 1:15
  // WED
  [3, "07:30", "7", "B", 7, "science"],
  [3, "08:30", "8", "A", 8, "science"],
  [3, "09:45", "7", "B", 7, "science"],
  [3, "10:45", "9", "A", 9, "science"],
  [3, "11:45", "8", "B", 8, "science"],
  [3, "13:15", "rr", null, 0, "rr"],     // Resource Room Support 1:15
  // THU
  [4, "07:30", "8", "A", 8, "science"],
  [4, "08:30", "8", "B", 8, "science"],
  [4, "09:45", "7", "B", 7, "science"],
  [4, "10:45", "9", "A", 9, "science"],
  [4, "11:45", "7", "B", 7, "science"],
  // FRI
  [5, "07:30", "8", "B", 5, "science"],  // wait FRI 7:30 = 8B, use SECONDARY
  [5, "08:30", "8", "A", 8, "science"],
  [5, "09:45", "7", "B", 7, "science"],
];

// Fix FRI 7:30 8B — grade 8 is MIDDLE, use LOW_SECONDARY
// Actually looking at the image: FRI 7:30=8B is a 7:30 slot which is SECONDARY level
// Grade 8 assignments use SECONDARY timeblocks for the shared morning slots

let created = 0;
for (const [day, startTime, gradeName, gradeSection, gradeNum, subjectType] of slots) {
  if (subjectType === "rr") {
    if (!rrSubject) { console.warn("  ⚠️  Resource Room subject not found, skipping"); continue; }
    const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime: "13:15", level: { in: ["SECONDARY","BOTH"] } } });
    if (!tb) { console.warn(`  ⚠️  No TB for Resource Room day${day}`); continue; }
    await p.assignment.create({
      data: { teacherId: teacher.id, subjectId: rrSubject.id, gradeId: null, roomId: room18?.id ?? null, timeBlockId: tb.id, status: "CONFIRMED" },
    });
    console.log(`  ✅ Created: Day${day} 13:15 Resource Room Support`);
    created++;
    continue;
  }

  const grade = await getGrade(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection??""}`); continue; }

  // For morning shared slots (07:30, 08:30, 09:45) grade 7/8 uses SECONDARY timeblocks
  // For afternoon Middle slots (10:45 SHORT, 12:00, 13:00, 14:00) use LOW_SECONDARY
  // For High slots (10:45 LONG, 11:45, 13:15, 14:15) use SECONDARY
  let levels;
  if ([6,7,8].includes(gradeNum) && ["10:45","12:00","13:00","14:00"].includes(startTime)) {
    levels = ["LOW_SECONDARY","BOTH"];
  } else {
    levels = ["SECONDARY","BOTH"];
  }

  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) { console.warn(`  ⚠️  No TB: day${day} ${startTime} grade${gradeNum}`); continue; }

  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: scienceSubject.id, gradeId: grade.id, roomId: room18?.id ?? null, timeBlockId: tb.id, status: "CONFIRMED" },
  });
  console.log(`  ✅ Created: Day${day} ${startTime} Grade ${gradeName}${gradeSection??""} Science`);
  created++;
}

// Restore homeroom if it was deleted
const hrCheck = await p.assignment.findFirst({ where: { teacherId: teacher.id, subject: { name: "Homeroom" } } });
if (!hrCheck && homeroom) {
  await p.assignment.create({
    data: {
      teacherId: teacher.id,
      subjectId: homeroom.subjectId,
      gradeId: homeroom.gradeId,
      roomId: homeroom.roomId,
      timeBlockId: homeroom.timeBlockId,
      status: "CONFIRMED",
    },
  });
  console.log("  ✅ Restored Homeroom");
}

console.log(`\nDone: ${created} created`);
await p.$disconnect();
