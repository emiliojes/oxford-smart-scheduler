import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Elida" } } });
const subject = await p.subject.findFirst({ where: { name: "Spanish" } });

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });
const getTB = async (day, startTime, levels) => {
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime, level: { in: levels } } });
  if (!tb) console.warn(`  ⚠️  No TB: day${day} ${startTime}`);
  return tb;
};

const create = async (day, startTime, gradeName, gradeSection, levels) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection??""}`); return; }
  const tb = await getTB(day, startTime, levels);
  if (!tb) return;
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: Day${day} ${startTime} ${gradeName}${gradeSection??""}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: subject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED" },
  });
  console.log(`  ✅ Created: Day${day} ${startTime} Grade ${gradeName}${gradeSection??""}`);
};

const HIGH = ["SECONDARY","BOTH"];
const MID  = ["LOW_SECONDARY","BOTH"];

// Missing from image:
// MON 2:15 = 14:15 → 8B (MIDDLE → 14:00 LOW_SECONDARY)  — already exists as 14:00 ✅
// TUE 1:15 = 13:15 → 12A HIGH  — already exists ✅
// TUE 2:15 = 14:15 → 11B HIGH
await create(2, "14:15", "11","B", HIGH);
// WED 8:30 → 9B HIGH (image shows IX B at WED 8:30)
await create(3, "08:30", "9","B", HIGH);
// WED 1:15 = 13:15 → 12A ✅ already exists
// WED 2:15 = 14:15 → 9A HIGH  — already exists as WED 14:15 ✅
// THU 1:15 = 13:15 → 12A ✅ already exists
// THU 2:15 = 14:15 → 11B HIGH
await create(4, "14:15", "11","B", HIGH);
// FRI 11:45 → 8B MIDDLE → use 12:00 LOW_SECONDARY — already exists ✅
// FRI 2:15 = 14:15 → 11B HIGH (image shows XI B in red FRI col... wait FRI 2:15 col is empty in image)
// Re-reading: THU 2:15 red = XI B, FRI col 2:15 = empty

// Also missing from full image read:
// MON 8:30 → XI A (11A) already exists ✅
// TUE 8:30 → VIII B (8B) already exists ✅  
// WED 9:45 → 8B already exists ✅

console.log("\nDone.");
await p.$disconnect();
