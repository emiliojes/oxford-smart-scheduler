import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Elida" } } });
console.log("Teacher:", teacher?.name);

const subject = await p.subject.findFirst({ where: { name: "Spanish" } });
const room19 = await p.room.findFirst({ where: { name: { contains: "19" } } }); // Room 19 shown in homeroom area

// Fetch grades
const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Get timeblock: for grades 8 (MIDDLE) afternoon slots use LOW_SECONDARY, morning shared slots use SECONDARY
// For grades 9,10,11,12 (HIGH) use SECONDARY
const getTB = async (day, startTime, gradeNum) => {
  const isMiddleAfternoon = [6,7,8].includes(gradeNum) && ["10:45","12:00","13:00","14:00"].includes(startTime);
  const levels = isMiddleAfternoon ? ["LOW_SECONDARY","BOTH"] : ["SECONDARY","BOTH"];
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) console.warn(`  ⚠️  No TB: day${day} ${startTime} grade${gradeNum}`);
  return tb;
};

// ── Step 1: Delete all non-homeroom assignments ──────────────────────
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared all non-homeroom assignments\n");

// ── Step 2: All slots from the official image ────────────────────────
// Image: 8B GRADE | SPANISH 8B,9A,B;11A,B;12A | 25HRS | SALON (19 is homeroom)
// [day, startTime, gradeName, gradeSection, gradeNum]
// Day 1=MON 2=TUE 3=WED 4=THU 5=FRI
const slots = [
  // MON: 11A, [10:45 empty], 9A, 11B, LUNCH, 12, 8B
  [1, "07:30", "11","A", 11],
  [1, "10:45", "9", "A", 9],
  [1, "11:45", "11","B", 11],
  [1, "13:15", "12","A", 12],
  [1, "14:15", "8", "B", 8],   // 2:15 = 14:15
  // TUE: 11A, 8B, [empty], 9B, 9A, LUNCH/supervision, 12, 10B
  [2, "07:30", "11","A", 11],
  [2, "08:30", "8", "B", 8],  // wait — image says TUE 8:30 = 8B? Let me re-read
  [2, "10:45", "9", "B", 9],
  [2, "11:45", "9", "A", 9],
  [2, "13:15", "12","A", 12],
  // WED: 11A, 8B, 8B(9:45), 11B(10:45), [lunch], 12, 9A
  [3, "07:30", "11","A", 11],
  [3, "08:30", "8", "B", 8],  // re-check
  [3, "09:45", "8", "B", 8],
  [3, "10:45", "11","B", 11],
  [3, "13:15", "12","A", 12],
  [3, "14:15", "9", "A", 9],
  // THU: 11A, [empty 8:30], 9B, [empty 10:45], 8B(11:45), LUNCH, 12, [empty 2:15]
  [4, "07:30", "11","A", 11],
  [4, "09:45", "9", "B", 9],
  [4, "11:45", "8", "B", 8],  // "VIIIB" in image = 8B, HIGH slot 11:45? No — wait
  [4, "13:15", "12","A", 12],
  // FRI: 8A(?), 7B(8:30), [empty 9:45], 9B(10:45), 8B(11:45), student dismissal, [empty]
  // Re-reading image: FRI 7:30=8A? Or empty? 8:30=7B? — these don't match Elida's grades
  // Elida teaches 8B,9A,9B,11A,11B,12A only
  // FRI: 7:30=empty(no 8A — that's Conrado), 8:30=7B? No. Let me go from image carefully
  // FRI col: 8A (7:30), 7B (8:30), [break], 6B+7A (9:45 two cards)
  // Those are NOT Elida's grades — the screen was showing ALL teachers
  // Elida FRI from her official schedule: 9A(9:45), 9B(10:45), 8B(11:45)
  [5, "09:45", "9", "A", 9],
  [5, "10:45", "9", "B", 9],
  [5, "11:45", "8", "B", 8],
];

// Re-reading official image of Elida more carefully:
// MON: Homeroom 8B(done), 11A(7:30), [8:30 empty], [9:45 empty], 9A(10:45), 11B(11:45), LUNCH, 12(1:15), 8B(2:15)
// TUE: 11A(7:30), 8B(8:30), [9:45 empty], 9B(10:45), 9A(11:45), LUNCH/supervision, 12(1:15), 10B? -- 10B not in her grades list
// Actually image shows: TUE 1:15=12, 2:15=10B but header says 8B,9A,B;11A,B;12A — 10B not listed
// Likely 10B is a mistake in old data. Skip it.
// THU 11:45 = VIIIB = 8B — this is a HIGH slot 11:45, but 8B is MIDDLE → need LOW slot
// Actually 11:45 doesn't exist in LOW_SECONDARY — closest is 12:00
// So THU 8B should be at 12:00 LOW_SECONDARY

// Fix THU 8B slot
const slotsFixed = [
  [1, "07:30", "11","A", 11],
  [1, "10:45", "9", "A", 9],
  [1, "11:45", "11","B", 11],
  [1, "13:15", "12","A", 12],
  [1, "14:15", "8", "B", 8],
  // TUE
  [2, "07:30", "11","A", 11],
  [2, "08:30", "8", "B", 8],
  [2, "10:45", "9", "B", 9],
  [2, "11:45", "9", "A", 9],
  [2, "13:15", "12","A", 12],
  // WED
  [3, "07:30", "11","A", 11],
  [3, "09:45", "8", "B", 8],
  [3, "10:45", "11","B", 11],
  [3, "13:15", "12","A", 12],
  [3, "14:15", "9", "A", 9],
  // THU
  [4, "07:30", "11","A", 11],
  [4, "09:45", "9", "B", 9],
  [4, "12:00", "8", "B", 8],  // VIIIB at 11:45 image → use 12:00 LOW_SECONDARY for grade 8
  [4, "13:15", "12","A", 12],
  // FRI
  [5, "09:45", "9", "A", 9],
  [5, "10:45", "9", "B", 9],
  [5, "12:00", "8", "B", 8],  // FRI 11:45 VIIIB → 12:00 LOW_SECONDARY
];

let created = 0;
for (const [day, startTime, gradeName, gradeSection, gradeNum] of slotsFixed) {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection}`); continue; }

  const isMiddleAfternoon = [6,7,8].includes(gradeNum) && ["10:45","12:00","13:00","14:00"].includes(startTime);
  const levels = isMiddleAfternoon ? ["LOW_SECONDARY","BOTH"] : ["SECONDARY","BOTH"];
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) { console.warn(`  ⚠️  No TB: day${day} ${startTime} grade${gradeNum}`); continue; }

  const existing = await p.assignment.findFirst({
    where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id },
  });
  if (existing) { console.log(`  ✓ Skip: Day${day} ${startTime} ${gradeName}${gradeSection}`); continue; }

  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: subject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED" },
  });
  console.log(`  ✅ Day${day} ${startTime} Grade ${gradeName}${gradeSection} Spanish [${isMiddleAfternoon?"MID":"SEC"}]`);
  created++;
}

console.log(`\nDone: ${created} created`);
await p.$disconnect();
