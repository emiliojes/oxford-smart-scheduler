/**
 * Ricardo Ferran — find assignments by grade+day+time (any subject) and set teacher = Ricardo
 * LAB note on specified slots
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const ricardo = await p.teacher.findFirst({ where: { name: { contains: "Ricardo" } } });
console.log(`Ricardo: ${ricardo.id}`);

// First revert the FRI 07:30 11B that was wrongly changed to Literature
// Actually check what's there
const grade11B = await p.grade.findFirst({ where: { name: "11", section: "B" } });
const fri730 = await p.assignment.findFirst({
  where: { gradeId: grade11B.id, timeBlock: { dayOfWeek: 5, startTime: "07:30" } },
  include: { subject: true },
});
console.log(`FRI 07:30 11B current: ${fri730?.subject.name}`);

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

  const asgn = await p.assignment.findFirst({
    where: { gradeId: grade.id, timeBlock: { dayOfWeek: slot.day, startTime: slot.start } },
    include: { subject: true },
  });

  if (!asgn) {
    console.warn(`  ⚠ No assignment: ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}`);
    notFound++;
    continue;
  }
  await p.assignment.update({
    where: { id: asgn.id },
    data: { teacherId: ricardo.id, note: slot.lab ? "LAB" : null },
  });
  console.log(`  ✓ ${days[slot.day]} ${slot.start} ${slot.grade}${slot.section}  ${asgn.subject.name}${slot.lab ? " (LAB)" : ""}`);
  updated++;
}

// Ensure Homeroom 11B → Ricardo
const hrAsgn = await p.assignment.findFirst({
  where: { gradeId: grade11B.id, subject: { name: "Homeroom" } },
});
if (hrAsgn) {
  await p.assignment.update({ where: { id: hrAsgn.id }, data: { teacherId: ricardo.id } });
  console.log("  ✓ Homeroom 11B → Ricardo");
}

console.log(`\nUpdated: ${updated}  Not found: ${notFound}`);
console.log(`Total Ricardo: ${updated + 1}`);
await p.$disconnect();
