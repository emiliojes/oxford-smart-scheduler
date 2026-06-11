/**
 * Andrea Concepcion — Biology exact schedule from image
 * First: revert all Biology assignments back to previous teacher (Conrado de Leon)
 * Then: reassign only the exact slots shown in the image to Andrea
 *
 * EXACT slots from image:
 * MON: 7:30 Homeroom(11A) | 8:30 10A | 9:45 12A | 10:45 9B | 11:45 11A
 * TUE: 7:30 10A | 8:30 11A(LAB) | 9:45 12A | 11:45 11B(LAB) | 1:15 10B | 2:15 9B
 * WED: 7:30 10A(LAB) | 8:30 11A | 9:45 9B | 11:45 10B(LAB) | 2:15 12A
 * THU: 7:30 10A | 10:45 12A(LAB) | 11:45 11B
 * FRI: 7:30 11A | 8:30 10B | 9:45 12A | 11:45 11B
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });
const conrado = await p.teacher.findFirst({ where: { name: { contains: "Conrado" } } });
console.log(`Andrea: ${andrea.id}`);
console.log(`Conrado: ${conrado.id}`);

const gradeNames = ["9A","9B","10A","10B","11A","11B","12A"];

// Step 1: revert all Biology assignments from Andrea → Conrado
for (const gn of gradeNames) {
  const grade = await p.grade.findFirst({ where: { name: gn.slice(0,-1), section: gn.slice(-1) } });
  if (!grade) continue;
  const asgns = await p.assignment.findMany({
    where: { gradeId: grade.id, teacherId: andrea.id, subject: { name: "Biology" } },
  });
  for (const a of asgns) {
    await p.assignment.update({ where: { id: a.id }, data: { teacherId: conrado.id } });
  }
  if (asgns.length) console.log(`  Reverted ${asgns.length} Biology from ${gn} → Conrado`);
}

// Step 2: reassign exact slots to Andrea
// day, startTime, gradeName
const exactSlots = [
  { day: 1, start: "08:30", grade: "10A" },
  { day: 1, start: "09:45", grade: "12A" },
  { day: 1, start: "10:45", grade: "9B"  },
  { day: 1, start: "11:45", grade: "11A" },
  { day: 2, start: "07:30", grade: "10A" },
  { day: 2, start: "08:30", grade: "11A" },
  { day: 2, start: "09:45", grade: "12A" },
  { day: 2, start: "11:45", grade: "11B" },
  { day: 2, start: "13:15", grade: "10B" },
  { day: 2, start: "14:15", grade: "9B"  },
  { day: 3, start: "07:30", grade: "10A" },
  { day: 3, start: "08:30", grade: "11A" },
  { day: 3, start: "09:45", grade: "9B"  },
  { day: 3, start: "11:45", grade: "10B" },
  { day: 3, start: "14:15", grade: "12A" },
  { day: 4, start: "07:30", grade: "10A" },
  { day: 4, start: "10:45", grade: "12A" },
  { day: 4, start: "11:45", grade: "11B" },
  { day: 5, start: "07:30", grade: "11A" },
  { day: 5, start: "08:30", grade: "10B" },
  { day: 5, start: "09:45", grade: "12A" },
  { day: 5, start: "11:45", grade: "11B" },
];

let updated = 0;
for (const slot of exactSlots) {
  const grade = await p.grade.findFirst({ where: { name: slot.grade.slice(0,-1), section: slot.grade.slice(-1) } });
  if (!grade) { console.warn(`Grade ${slot.grade} not found`); continue; }

  const asgn = await p.assignment.findFirst({
    where: {
      gradeId: grade.id,
      subject: { name: "Biology" },
      timeBlock: { dayOfWeek: slot.day, startTime: slot.start },
    },
  });
  if (!asgn) { console.warn(`  No Biology assignment found: Day${slot.day} ${slot.start} ${slot.grade}`); continue; }
  await p.assignment.update({ where: { id: asgn.id }, data: { teacherId: andrea.id } });
  updated++;
}
console.log(`\nUpdated ${updated} exact slots → Andrea`);

// Verify
console.log("\nAndrea final assignments:");
const days = ["","MON","TUE","WED","THU","FRI"];
const all = await p.assignment.findMany({
  where: { teacherId: andrea.id },
  include: { grade: true, subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
all.forEach(a => console.log(`  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}  Grade ${a.grade.name}${a.grade.section}  ${a.subject.name}`));

await p.$disconnect();
console.log("Done!");
