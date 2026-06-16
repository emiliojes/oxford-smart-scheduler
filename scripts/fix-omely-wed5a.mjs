import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Omely" } } });
const grade5A = await p.grade.findFirst({ where: { name: "5", section: "A" } });

// WED 12:00 5A is wrong — remove it (5A should be at 11:15 on WED)
const wrong = await p.assignment.findFirst({
  where: { teacherId: teacher.id, gradeId: grade5A.id, timeBlock: { dayOfWeek: 3, startTime: "12:00" } },
});
if (wrong) {
  await p.assignment.delete({ where: { id: wrong.id } });
  console.log("✅ Deleted WED 12:00 Grade 5A (duplicate)");
} else {
  console.log("ℹ️  Not found");
}

// Also TUE: 5A and 5B both at 11:15 — that's correct (different grades same slot)
// Check if there are any other unexpected duplicates
const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true },
});
console.log(`Total: ${asgns.length} assignments`);
await p.$disconnect();
