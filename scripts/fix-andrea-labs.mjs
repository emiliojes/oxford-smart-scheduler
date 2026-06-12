/**
 * 1. Add MON 13:15 11B Biology → Andrea
 * 2. Add WED 14:15 12A Biology → Andrea (if possible)
 * 3. Mark LAB notes on specific assignments:
 *    TUE 8:30  11A - LAB
 *    TUE 11:45 11B - LAB
 *    WED 7:30  10A - LAB
 *    WED 11:45 10B - LAB
 *    THU 10:45 12A - LAB
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });

// --- 1. Add MON 13:15 11B ---
const grade11B = await p.grade.findFirst({ where: { name: "11", section: "B" } });
const bioSubject = await p.subject.findFirst({ where: { name: "Biology" } });
const monTB = await p.timeBlock.findFirst({ where: { dayOfWeek: 1, startTime: "13:15", blockType: "CLASS" } });

if (monTB) {
  const existing = await p.assignment.findFirst({
    where: { gradeId: grade11B.id, timeBlockId: monTB.id },
  });
  if (existing) {
    await p.assignment.update({ where: { id: existing.id }, data: { teacherId: andrea.id } });
    console.log("MON 13:15 11B → updated to Andrea");
  } else {
    await p.assignment.create({
      data: { teacherId: andrea.id, gradeId: grade11B.id, subjectId: bioSubject.id, timeBlockId: monTB.id },
    });
    console.log("MON 13:15 11B → created for Andrea");
  }
}

// --- 2. Mark LAB notes ---
const labSlots = [
  { day: 2, start: "08:30", grade: "11", section: "A" },
  { day: 2, start: "11:45", grade: "11", section: "B" },
  { day: 3, start: "07:30", grade: "10", section: "A" },
  { day: 3, start: "11:45", grade: "10", section: "B" },
  { day: 4, start: "10:45", grade: "12", section: "A" },
];

const days = ["","MON","TUE","WED","THU","FRI"];
for (const slot of labSlots) {
  const grade = await p.grade.findFirst({ where: { name: slot.grade, section: slot.section } });
  const asgn = await p.assignment.findFirst({
    where: { teacherId: andrea.id, gradeId: grade.id, timeBlock: { dayOfWeek: slot.day, startTime: slot.start } },
  });
  if (asgn) {
    await p.assignment.update({ where: { id: asgn.id }, data: { note: "LAB" } });
    console.log(`${days[slot.day]} ${slot.start} ${slot.grade}${slot.section} → note: LAB`);
  } else {
    console.warn(`  ⚠ Not found: ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}`);
  }
}

await p.$disconnect();
console.log("Done!");
