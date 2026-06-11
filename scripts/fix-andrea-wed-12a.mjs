/**
 * WED 14:15 - 12A Biology for Andrea — assignment missing in DB
 * Check what exists at WED 14:15 for 12A and create if needed
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });
const grade12A = await p.grade.findFirst({ where: { name: "12", section: "A" } });
const bio = await p.subject.findFirst({ where: { name: "Biology" } });

// Check existing assignments for 12A on WED
const wed12A = await p.assignment.findMany({
  where: { gradeId: grade12A.id, timeBlock: { dayOfWeek: 3 } },
  include: { subject: true, timeBlock: true, teacher: true },
  orderBy: { timeBlock: { startTime: "asc" } },
});
console.log("12A Wednesday assignments:");
wed12A.forEach(a => console.log(`  ${a.timeBlock.startTime}  ${a.subject.name}  Teacher: ${a.teacher?.name}`));

// Find timeblock WED 14:15
const tb = await p.timeBlock.findFirst({
  where: { dayOfWeek: 3, startTime: "14:15", blockType: "CLASS" },
});
console.log(`\nWED 14:15 timeblock: ${tb?.id ?? "NOT FOUND"}`);

if (tb) {
  // Check if 12A already has any assignment at this slot
  const existing = await p.assignment.findFirst({
    where: { gradeId: grade12A.id, timeBlockId: tb.id },
  });
  if (existing) {
    // Update teacher to Andrea
    await p.assignment.update({ where: { id: existing.id }, data: { teacherId: andrea.id } });
    console.log(`Updated existing assignment → Andrea`);
  } else {
    // Create new assignment
    await p.assignment.create({
      data: { teacherId: andrea.id, gradeId: grade12A.id, subjectId: bio.id, timeBlockId: tb.id },
    });
    console.log(`Created new Biology assignment for 12A WED 14:15 → Andrea`);
  }
}

await p.$disconnect();
console.log("Done!");
