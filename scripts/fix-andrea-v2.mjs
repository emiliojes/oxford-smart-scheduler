/**
 * Fix Andrea Concepcion to match image exactly.
 * 
 * EXACT slots from image:
 * MON: Homeroom(11A) | 8:30 10A | 9:45 12A | 10:45 9B | 11:45 11A
 * TUE: 7:30 10A | 8:30 11A | 9:45 12A | 11:45 11B | 1:15 10B | 2:15 9B
 * WED: 7:30 10A | 8:30 11A | 9:45 9B | 11:45 10B | 2:15 12A
 * THU: 7:30 10A | 10:45 12A | 11:45 11B | 1:15 10B | 2:15 9B
 * FRI: 7:30 11A | 8:30 10B | 9:45 12A | 11:45 11B
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });
const conrado = await p.teacher.findFirst({ where: { name: { contains: "Conrado" } } });

// Step 1: revert all Andrea Biology assignments back to Conrado
const allAndrea = await p.assignment.findMany({
  where: { teacherId: andrea.id, subject: { name: "Biology" } },
});
for (const a of allAndrea) {
  await p.assignment.update({ where: { id: a.id }, data: { teacherId: conrado.id } });
}
console.log(`Reverted ${allAndrea.length} Biology → Conrado`);

// Step 2: assign exact slots to Andrea
const exactSlots = [
  { day: 1, start: "08:30", grade: "10", section: "A" },
  { day: 1, start: "09:45", grade: "12", section: "A" },
  { day: 1, start: "10:45", grade: "9",  section: "B" },
  { day: 1, start: "11:45", grade: "11", section: "A" },
  { day: 2, start: "07:30", grade: "10", section: "A" },
  { day: 2, start: "08:30", grade: "11", section: "A" },
  { day: 2, start: "09:45", grade: "12", section: "A" },
  { day: 2, start: "11:45", grade: "11", section: "B" },
  { day: 2, start: "13:15", grade: "10", section: "B" },
  { day: 2, start: "14:15", grade: "9",  section: "B" },
  { day: 3, start: "07:30", grade: "10", section: "A" },
  { day: 3, start: "08:30", grade: "11", section: "A" },
  { day: 3, start: "09:45", grade: "9",  section: "B" },
  { day: 3, start: "11:45", grade: "10", section: "B" },
  { day: 3, start: "14:15", grade: "12", section: "A" },
  { day: 4, start: "07:30", grade: "10", section: "A" },
  { day: 4, start: "10:45", grade: "12", section: "A" },
  { day: 4, start: "11:45", grade: "11", section: "B" },
  { day: 4, start: "13:15", grade: "10", section: "B" },
  { day: 4, start: "14:15", grade: "9",  section: "B" },
  { day: 5, start: "07:30", grade: "11", section: "A" },
  { day: 5, start: "08:30", grade: "10", section: "B" },
  { day: 5, start: "09:45", grade: "12", section: "A" },
  { day: 5, start: "11:45", grade: "11", section: "B" },
];

const days = ["","MON","TUE","WED","THU","FRI"];
let updated = 0;
for (const slot of exactSlots) {
  const grade = await p.grade.findFirst({ where: { name: slot.grade, section: slot.section } });
  if (!grade) { console.warn(`Grade ${slot.grade}${slot.section} not found`); continue; }

  const asgn = await p.assignment.findFirst({
    where: {
      gradeId: grade.id,
      subject: { name: "Biology" },
      timeBlock: { dayOfWeek: slot.day, startTime: slot.start },
    },
  });
  if (!asgn) {
    console.warn(`  ⚠ No Biology found: ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}`);
    continue;
  }
  await p.assignment.update({ where: { id: asgn.id }, data: { teacherId: andrea.id } });
  updated++;
}
console.log(`Updated ${updated} exact slots → Andrea`);

// Verify final
console.log("\nAndrea final:");
const final = await p.assignment.findMany({
  where: { teacherId: andrea.id },
  include: { grade: true, subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
final.forEach(a => console.log(`  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}  ${a.grade.name}${a.grade.section}  ${a.subject.name}`));
console.log(`Total: ${final.length}`);

await p.$disconnect();
