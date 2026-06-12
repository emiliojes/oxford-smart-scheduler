/**
 * Ricardo Ferran — Chemistry 9-12, Homeroom 11B, Salón 21
 * For each slot: if assignment exists → update teacher+subject
 *                if not → create new assignment with Chemistry/Ricardo
 *
 * Exact slots from image:
 * MON: Homeroom(11B) | 8:30 11B(LAB) | 9:45 9B | 11:45 10A | 1:15 9A | 2:15 10B
 * TUE: 7:30 11B | 8:30 12A | 9:45 9B | 10:45 10B | 11:45 10A | 1:15 11A
 * WED: 7:30 11B | 8:30 12A | 9:45 9A | 11:45 10A | 2:15 11A
 * THU: 8:30 12A(LAB) | 9:45 11A | 10:45 9B | 11:45 10B(LAB)
 * FRI: 7:30 11B | 8:30 12A | 9:45 11A | 10:45 9A | 11:45 10B | 2:15 10A(LAB)
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const ricardo = await p.teacher.findFirst({ where: { name: { contains: "Ricardo" } } });
const chemSubject = await p.subject.findFirst({ where: { name: "Chemistry" } });
const ROOM21 = "cmq5x9vd10001pr5qajo7mvhl";

console.log(`Ricardo: ${ricardo.id}`);
console.log(`Chemistry: ${chemSubject.id}`);

const exactSlots = [
  { day: 1, start: "08:30", grade: "11", section: "B", lab: true  },
  { day: 1, start: "09:45", grade: "9",  section: "B", lab: false },
  { day: 1, start: "11:45", grade: "10", section: "A", lab: false },
  { day: 1, start: "13:15", grade: "9",  section: "A", lab: false },
  { day: 1, start: "14:15", grade: "10", section: "B", lab: false },
  { day: 2, start: "07:30", grade: "11", section: "B", lab: false },
  { day: 2, start: "08:30", grade: "12", section: "A", lab: false },
  { day: 2, start: "09:45", grade: "9",  section: "B", lab: false },
  { day: 2, start: "10:45", grade: "10", section: "B", lab: false },
  { day: 2, start: "11:45", grade: "10", section: "A", lab: false },
  { day: 2, start: "13:15", grade: "11", section: "A", lab: false },
  { day: 3, start: "07:30", grade: "11", section: "B", lab: false },
  { day: 3, start: "08:30", grade: "12", section: "A", lab: false },
  { day: 3, start: "09:45", grade: "9",  section: "A", lab: false },
  { day: 3, start: "11:45", grade: "10", section: "A", lab: false },
  { day: 3, start: "14:15", grade: "11", section: "A", lab: false },
  { day: 4, start: "08:30", grade: "12", section: "A", lab: true  },
  { day: 4, start: "09:45", grade: "11", section: "A", lab: false },
  { day: 4, start: "10:45", grade: "9",  section: "B", lab: false },
  { day: 4, start: "11:45", grade: "10", section: "B", lab: true  },
  { day: 5, start: "07:30", grade: "11", section: "B", lab: false },
  { day: 5, start: "08:30", grade: "12", section: "A", lab: false },
  { day: 5, start: "09:45", grade: "11", section: "A", lab: false },
  { day: 5, start: "10:45", grade: "9",  section: "A", lab: false },
  { day: 5, start: "11:45", grade: "10", section: "B", lab: false },
  { day: 5, start: "14:15", grade: "10", section: "A", lab: true  },
];

const days = ["","MON","TUE","WED","THU","FRI"];
let updated = 0;
let created = 0;

for (const slot of exactSlots) {
  const grade = await p.grade.findFirst({ where: { name: slot.grade, section: slot.section } });
  if (!grade) { console.warn(`Grade ${slot.grade}${slot.section} not found`); continue; }

  const tb = await p.timeBlock.findFirst({
    where: { dayOfWeek: slot.day, startTime: slot.start, blockType: "CLASS", level: "SECONDARY" },
  });
  if (!tb) { console.warn(`⚠ No timeblock: ${days[slot.day]} ${slot.start}`); continue; }

  const existing = await p.assignment.findFirst({
    where: { gradeId: grade.id, timeBlockId: tb.id },
    include: { subject: true },
  });

  if (existing) {
    await p.assignment.update({
      where: { id: existing.id },
      data: { teacherId: ricardo.id, subjectId: chemSubject.id, note: slot.lab ? "LAB" : null },
    });
    console.log(`  ✓ updated  ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}  (was: ${existing.subject.name})${slot.lab ? " LAB" : ""}`);
    updated++;
  } else {
    await p.assignment.create({
      data: {
        teacherId: ricardo.id,
        gradeId: grade.id,
        subjectId: chemSubject.id,
        timeBlockId: tb.id,
        roomId: ROOM21,
        note: slot.lab ? "LAB" : null,
      },
    });
    console.log(`  + created  ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}${slot.lab ? " LAB" : ""}`);
    created++;
  }
}

// Ensure Homeroom 11B → Ricardo
const grade11B = await p.grade.findFirst({ where: { name: "11", section: "B" } });
const hrAsgn = await p.assignment.findFirst({ where: { gradeId: grade11B.id, subject: { name: "Homeroom" } } });
if (hrAsgn) {
  await p.assignment.update({ where: { id: hrAsgn.id }, data: { teacherId: ricardo.id } });
  console.log("  ✓ Homeroom 11B → Ricardo");
}

console.log(`\nUpdated: ${updated}  Created: ${created}`);
await p.$disconnect();
console.log("Done!");
