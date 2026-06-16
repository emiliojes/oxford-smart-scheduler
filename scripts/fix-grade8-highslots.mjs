import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["","MON","TUE","WED","THU","FRI"];

// Fix 1: Judith Gil — 8A TUE 10:45 uses HIGH slot (10:45-11:45), should be LOW_SECONDARY (10:45-11:30)
// Fix 2: Judith Gil — 8A FRI 11:45 uses HIGH slot (11:45-12:45), no Middle equivalent → move to FRI 12:00 LOW_SECONDARY
// Fix 3: Conrado   — 8B TUE 11:45 uses HIGH slot (11:45-12:45), no Middle equivalent → move to TUE 12:00 LOW_SECONDARY
// Fix 4: Conrado   — 8B WED 11:45 uses HIGH slot (11:45-12:45), no Middle equivalent → move to WED 12:00 LOW_SECONDARY
// Also: 8A WED 09:45 has DUPLICATE Literature (Judith + Vielka) — need to remove Judith's since Judith teaches High Literature

const judith  = await p.teacher.findFirst({ where: { name: { contains: "Judith" } } });
const conrado = await p.teacher.findFirst({ where: { name: { contains: "Conrado" } } });
const grade8A = await p.grade.findFirst({ where: { name: "8", section: "A" } });
const grade8B = await p.grade.findFirst({ where: { name: "8", section: "B" } });

// Helper: get LOW_SECONDARY timeblock
const getLowTB = (day, startTime) => p.timeBlock.findFirst({
  where: { dayOfWeek: day, startTime, level: { in: ["LOW_SECONDARY","BOTH"] } },
});

// ── Fix 1: Judith 8A TUE 10:45 → change to 10:45-11:30 LOW_SECONDARY ──
const judithTue1045 = await p.assignment.findFirst({
  where: { teacherId: judith.id, gradeId: grade8A.id, timeBlock: { dayOfWeek: 2, startTime: "10:45", endTime: "11:45" } },
  include: { timeBlock: true },
});
const lowTue1045 = await getLowTB(2, "10:45");
if (judithTue1045 && lowTue1045) {
  await p.assignment.update({ where: { id: judithTue1045.id }, data: { timeBlockId: lowTue1045.id } });
  console.log("✅ Fix 1: Judith 8A TUE 10:45 → LOW_SECONDARY (10:45-11:30)");
} else {
  console.log("⚠️  Fix 1: not found", !!judithTue1045, !!lowTue1045);
}

// ── Fix 2: Judith 8A FRI 11:45 → delete (no Middle equivalent, Middle ends at 11:30 then LUNCH) ──
// Actually looking at image again: Judith's schedule shows 8A at FRI 11:45 which is HIGH slot
// Grade 8A is MIDDLE — this assignment is wrong. Delete it.
const judithFri1145 = await p.assignment.findFirst({
  where: { teacherId: judith.id, gradeId: grade8A.id, timeBlock: { dayOfWeek: 5, startTime: "11:45" } },
});
if (judithFri1145) {
  await p.assignment.delete({ where: { id: judithFri1145.id } });
  console.log("✅ Fix 2: Deleted Judith 8A FRI 11:45 (invalid HIGH slot for MIDDLE grade)");
}

// ── Fix 3: Conrado 8B TUE 11:45 → move to TUE 12:00 LOW_SECONDARY ──
const conradoTue1145 = await p.assignment.findFirst({
  where: { teacherId: conrado.id, gradeId: grade8B.id, timeBlock: { dayOfWeek: 2, startTime: "11:45" } },
});
const lowTue1200 = await getLowTB(2, "12:00");
if (conradoTue1145 && lowTue1200) {
  // Check no duplicate
  const dupCheck = await p.assignment.findFirst({ where: { teacherId: conrado.id, gradeId: grade8B.id, timeBlockId: lowTue1200.id } });
  if (!dupCheck) {
    await p.assignment.update({ where: { id: conradoTue1145.id }, data: { timeBlockId: lowTue1200.id } });
    console.log("✅ Fix 3: Conrado 8B TUE 11:45 → 12:00 LOW_SECONDARY");
  } else {
    await p.assignment.delete({ where: { id: conradoTue1145.id } });
    console.log("✅ Fix 3: Deleted Conrado 8B TUE 11:45 (12:00 already exists)");
  }
}

// ── Fix 4: Conrado 8B WED 11:45 → move to WED 12:00 LOW_SECONDARY ──
const conradoWed1145 = await p.assignment.findFirst({
  where: { teacherId: conrado.id, gradeId: grade8B.id, timeBlock: { dayOfWeek: 3, startTime: "11:45" } },
});
const lowWed1200 = await getLowTB(3, "12:00");
if (conradoWed1145 && lowWed1200) {
  const dupCheck = await p.assignment.findFirst({ where: { teacherId: conrado.id, gradeId: grade8B.id, timeBlockId: lowWed1200.id } });
  if (!dupCheck) {
    await p.assignment.update({ where: { id: conradoWed1145.id }, data: { timeBlockId: lowWed1200.id } });
    console.log("✅ Fix 4: Conrado 8B WED 11:45 → 12:00 LOW_SECONDARY");
  } else {
    await p.assignment.delete({ where: { id: conradoWed1145.id } });
    console.log("✅ Fix 4: Deleted Conrado 8B WED 11:45 (12:00 already exists)");
  }
}

// ── Fix 5: 8A WED 09:45 duplicate Literature — remove Judith's (she teaches High grades) ──
const judithWed0945_8A = await p.assignment.findFirst({
  where: { teacherId: judith.id, gradeId: grade8A.id, timeBlock: { dayOfWeek: 3, startTime: "09:45" } },
});
if (judithWed0945_8A) {
  await p.assignment.delete({ where: { id: judithWed0945_8A.id } });
  console.log("✅ Fix 5: Deleted Judith 8A WED 09:45 duplicate");
}

console.log("\nDone.");
await p.$disconnect();
