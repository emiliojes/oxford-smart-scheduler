/**
 * Ricardo Ferran — Chemistry 9-12, Homeroom 11B, Salón 21
 * Find assignments by grade+day+time and reassign teacher to Ricardo.
 * Also update subject to Chemistry and add LAB note where applicable.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const ricardo = await p.teacher.findFirst({ where: { name: { contains: "Ricardo" } } });
const chemSubject = await p.subject.findFirst({ where: { name: "Chemistry" } });
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
let notFound = 0;

for (const slot of exactSlots) {
  const grade = await p.grade.findFirst({ where: { name: slot.grade, section: slot.section } });
  if (!grade) { console.warn(`Grade ${slot.grade}${slot.section} not found`); continue; }

  // Find ANY assignment for this grade+day+time
  const asgn = await p.assignment.findFirst({
    where: {
      gradeId: grade.id,
      timeBlock: { dayOfWeek: slot.day, startTime: slot.start },
    },
    include: { subject: true },
  });

  if (!asgn) {
    console.warn(`  ⚠ No assignment: ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}`);
    notFound++;
    continue;
  }
  await p.assignment.update({
    where: { id: asgn.id },
    data: {
      teacherId: ricardo.id,
      subjectId: chemSubject.id,
      note: slot.lab ? "LAB" : null,
    },
  });
  console.log(`  ✓ ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}  (was: ${asgn.subject.name})${slot.lab ? " LAB" : ""}`);
  updated++;
}

console.log(`\nUpdated: ${updated}  Not found: ${notFound}`);

// Final check
const final = await p.assignment.findMany({
  where: { teacherId: ricardo.id },
  include: { grade: true, subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
console.log(`\nTotal Ricardo assignments: ${final.length}`);
await p.$disconnect();
