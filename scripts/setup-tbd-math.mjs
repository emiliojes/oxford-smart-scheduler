/**
 * Create placeholder teacher "TBD - Math 8-10" and assign all Math slots
 * for grades 7B, 8A, 8B, 10A, 10B + Homeroom 10A (Salon 09)
 *
 * From image:
 * MON:  Homeroom(10A) | 08:30 7B | 11:45 8A
 * TUE:  07:30 7B | 08:30 10A | 13:00 8A
 * WED:  07:30 7B | 10:45 10B | 12:00 8A (Middle)   [8B missing — check]
 * THU:  08:30 8A | 10:45 10A | 11:45 7B (red=conflict?) | 13:15 7B
 * FRI:  07:30 10A | 08:30 8B | 10:45 7B | 11:45 7B
 *
 * Strategy: reassign teacher on all Math assignments for these grades
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Create or find TBD teacher
let tbd = await p.teacher.findFirst({ where: { name: "TBD - Math 8-10" } });
if (!tbd) {
  tbd = await p.teacher.create({ data: { name: "TBD - Math 8-10", level: "BOTH" } });
  console.log(`Created teacher: TBD - Math 8-10 (${tbd.id})`);
} else {
  console.log(`Found teacher: TBD - Math 8-10 (${tbd.id})`);
}

// Room 09
const room9 = await p.room.findFirst({ where: { name: { contains: "#9" } } });
console.log(`Room: ${room9?.name} (${room9?.id})`);

// Grades to reassign Math
const gradeTargets = [
  { name: "7", section: "B" },
  { name: "8", section: "A" },
  { name: "8", section: "B" },
  { name: "10", section: "A" },
  { name: "10", section: "B" },
];

let updated = 0;
for (const gt of gradeTargets) {
  const grade = await p.grade.findFirst({ where: { name: gt.name, section: gt.section } });
  if (!grade) { console.warn(`Grade ${gt.name}${gt.section} not found`); continue; }

  const mathAsgns = await p.assignment.findMany({
    where: { gradeId: grade.id, subject: { name: "Math" } },
    include: { timeBlock: true },
  });

  const days = ["","MON","TUE","WED","THU","FRI"];
  for (const a of mathAsgns) {
    await p.assignment.update({
      where: { id: a.id },
      data: { teacherId: tbd.id, roomId: room9?.id ?? a.roomId },
    });
    console.log(`  ✓ ${days[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} Grade ${gt.name}${gt.section} Math → TBD`);
    updated++;
  }
}

// Homeroom 10A → TBD
const grade10A = await p.grade.findFirst({ where: { name: "10", section: "A" } });
const hrAsgn = await p.assignment.findFirst({
  where: { gradeId: grade10A.id, subject: { name: "Homeroom" } },
});
if (hrAsgn) {
  await p.assignment.update({
    where: { id: hrAsgn.id },
    data: { teacherId: tbd.id, roomId: room9?.id ?? hrAsgn.roomId },
  });
  console.log(`  ✓ Homeroom 10A → TBD`);
  updated++;
}

console.log(`\nTotal updated: ${updated}`);
await p.$disconnect();
console.log("Done!");
