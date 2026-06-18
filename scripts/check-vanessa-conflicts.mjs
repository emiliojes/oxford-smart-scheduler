import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Vanessa" } } });
const assignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true, subject: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

console.log(`Vanessa Muñoz — ${assignments.length} assignments\n`);

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

// Check for same-level, same-slot conflicts
const conflicts = [];
for (let i = 0; i < assignments.length; i++) {
  for (let j = i + 1; j < assignments.length; j++) {
    const a1 = assignments[i];
    const a2 = assignments[j];
    
    // Same day, same timeblock
    if (a1.timeBlock.dayOfWeek === a2.timeBlock.dayOfWeek && a1.timeBlock.id === a2.timeBlock.id) {
      conflicts.push({
        day: DAYS[a1.timeBlock.dayOfWeek],
        time: a1.timeBlock.startTime,
        grade1: a1.grade.name + a1.grade.section,
        grade2: a2.grade.name + a2.grade.section,
        type: "SAME_SLOT",
      });
    }
    
    // Same day, overlapping times (different levels)
    if (a1.timeBlock.dayOfWeek === a2.timeBlock.dayOfWeek && a1.timeBlock.id !== a2.timeBlock.id) {
      const start1 = a1.timeBlock.startTime;
      const end1 = a1.timeBlock.endTime;
      const start2 = a2.timeBlock.startTime;
      const end2 = a2.timeBlock.endTime;
      
      // Check if times overlap
      if ((start1 < end2 && end1 > start2)) {
        conflicts.push({
          day: DAYS[a1.timeBlock.dayOfWeek],
          time: `${start1}-${end1} vs ${start2}-${end2}`,
          grade1: a1.grade.name + a1.grade.section,
          grade2: a2.grade.name + a2.grade.section,
          type: "TIME_OVERLAP",
        });
      }
    }
  }
}

if (conflicts.length === 0) {
  console.log("✅ No conflicts found");
} else {
  console.log(`⚠️  Found ${conflicts.length} conflicts:\n`);
  conflicts.forEach(c => {
    console.log(`${c.day} ${c.time}: ${c.grade1} ↔ ${c.grade2} [${c.type}]`);
  });
}

await p.$disconnect();
