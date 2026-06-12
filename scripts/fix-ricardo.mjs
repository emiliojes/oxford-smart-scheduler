/**
 * Ricardo Ferran — Chemistry 9-12, Homeroom 11B, Salón 21
 * Reassign Chemistry assignments to Ricardo for exact slots from image.
 * Chemistry currently assigned to: Irlanda Tuñon (was Chemistry before we changed to Math)
 * Actually Chemistry teacher was the original — need to find who has Chemistry now.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const ricardo = await p.teacher.findFirst({ where: { name: { contains: "Ricardo" } } });
console.log(`Ricardo: ${ricardo.id}`);

const chemSubject = await p.subject.findFirst({ where: { name: "Chemistry" } });
console.log(`Chemistry subject: ${chemSubject.id}`);

// Exact slots from image
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

  // Find Chemistry assignment for this grade+day+time (any teacher)
  const asgn = await p.assignment.findFirst({
    where: {
      gradeId: grade.id,
      subject: { name: "Chemistry" },
      timeBlock: { dayOfWeek: slot.day, startTime: slot.start },
    },
  });

  if (!asgn) {
    console.warn(`  ⚠ No Chemistry: ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}`);
    notFound++;
    continue;
  }
  await p.assignment.update({
    where: { id: asgn.id },
    data: { teacherId: ricardo.id, note: slot.lab ? "LAB" : null },
  });
  updated++;
}

// Ensure Homeroom 11B → Ricardo
const grade11B = await p.grade.findFirst({ where: { name: "11", section: "B" } });
const hrAsgn = await p.assignment.findFirst({
  where: { gradeId: grade11B.id, subject: { name: "Homeroom" } },
});
if (hrAsgn) {
  await p.assignment.update({ where: { id: hrAsgn.id }, data: { teacherId: ricardo.id } });
  console.log("Homeroom 11B → Ricardo");
}

console.log(`\nUpdated: ${updated}  Not found: ${notFound}`);

// Final check
const final = await p.assignment.findMany({
  where: { teacherId: ricardo.id },
  include: { grade: true, subject: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});
console.log("\nRicardo final assignments:");
final.forEach(a => console.log(`  ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}  ${a.grade.name}${a.grade.section}  ${a.subject.name}${a.note ? " ("+a.note+")" : ""}`));
console.log(`Total: ${final.length}`);

await p.$disconnect();
