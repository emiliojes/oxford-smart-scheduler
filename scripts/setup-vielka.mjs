import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Vielka" } } });
const englishSubject = await p.subject.findFirst({ where: { name: "English" } });
const room15 = await p.room.findFirst({ where: { name: { contains: "15" } } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", englishSubject?.name);
console.log("Room:", room15?.name);

// ── Step 1: Delete ALL non-homeroom assignments ──────────────────────
const homeroom = await p.assignment.findFirst({
  where: { teacherId: teacher.id, subject: { name: "Homeroom" } },
});
await p.assignment.deleteMany({
  where: { teacherId: teacher.id, id: { not: homeroom?.id ?? "none" } },
});
console.log("🗑️  Cleared all non-homeroom assignments\n");

// ── Step 2: Create assignments from official image ───────────────────
// Vielka: English 6-7, Homeroom 7A, Salon 15
// ALL grades are Middle (6,7) → all afternoon slots use LOW_SECONDARY
// Morning shared slots (07:30, 08:30, 09:45) use SECONDARY (shared)
// Afternoon Middle slots: 10:45(→11:30), 11:45(→12:45 NO-use 12:00), 12:00, 13:00, 14:00
// Image:
// MON: Homeroom(7A), 7A(8:30), 6A(9:45), [10:45 empty], [11:45 empty], LUNCH, 6B(1:15), 7B(2:15)
// TUE: 7A(7:30), 6B(8:30), [9:45 empty], [10:45 empty], 6A(11:45→12:00?), LUNCH, [1:15 empty], 7B(2:15)
// WED: [7:30 empty], 6B(8:30), [9:45 empty], [10:45 empty], 6A(11:45→12:00?), LUNCH, 7B(1:15), 7A(2:15→14:00)
// THU: 7A(7:30), 6B(8:30), 7B(9:45→RED=conflict shown), 6A(10:45→LOW), [11:45 empty], LUNCH, 7B(1:15→13:00)
// FRI: 7B(7:30), 6B(8:30), [9:45 empty], 7A(10:45→LOW), 6A(11:45→12:00), Student dismissal, [empty]

// Note: 11:45 doesn't exist in LOW_SECONDARY — use 12:00 instead (that's the correct Middle slot after lunch)
// "11:45-12:45" shown in image is actually the HIGH slot — for Middle it becomes 12:00-13:00

const slots = [
  // MON
  [1, "08:30", "7","A", ["SECONDARY","BOTH"]],
  [1, "09:45", "6","A", ["SECONDARY","BOTH"]],
  [1, "13:00", "6","B", ["LOW_SECONDARY","BOTH"]],
  [1, "14:00", "7","B", ["LOW_SECONDARY","BOTH"]],
  // TUE
  [2, "07:30", "7","A", ["SECONDARY","BOTH"]],
  [2, "08:30", "6","B", ["SECONDARY","BOTH"]],
  [2, "12:00", "6","A", ["LOW_SECONDARY","BOTH"]],
  [2, "14:00", "7","B", ["LOW_SECONDARY","BOTH"]],
  // WED
  [3, "08:30", "6","B", ["SECONDARY","BOTH"]],
  [3, "12:00", "6","A", ["LOW_SECONDARY","BOTH"]],
  [3, "13:00", "7","B", ["LOW_SECONDARY","BOTH"]],
  [3, "14:00", "7","A", ["LOW_SECONDARY","BOTH"]],
  // THU
  [4, "07:30", "7","A", ["SECONDARY","BOTH"]],
  [4, "08:30", "6","B", ["SECONDARY","BOTH"]],
  [4, "09:45", "7","B", ["SECONDARY","BOTH"]],
  [4, "10:45", "6","A", ["LOW_SECONDARY","BOTH"]],
  [4, "13:00", "7","B", ["LOW_SECONDARY","BOTH"]],
  // FRI
  [5, "07:30", "7","B", ["SECONDARY","BOTH"]],
  [5, "08:30", "6","B", ["SECONDARY","BOTH"]],
  [5, "10:45", "7","A", ["LOW_SECONDARY","BOTH"]],
  [5, "12:00", "6","A", ["LOW_SECONDARY","BOTH"]],
];

let created = 0;
for (const [day, startTime, gradeName, gradeSection, levels] of slots) {
  const grade = await p.grade.findFirst({ where: { name: gradeName, section: gradeSection } });
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection}`); continue; }
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) { console.warn(`  ⚠️  No TB: day${day} ${startTime}`); continue; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: englishSubject.id, gradeId: grade.id, roomId: room15?.id ?? null, timeBlockId: tb.id, status: "CONFIRMED" },
  });
  console.log(`  ✅ Day${day} ${startTime} Grade ${gradeName}${gradeSection}`);
  created++;
}

console.log(`\nDone: ${created} created`);
await p.$disconnect();
