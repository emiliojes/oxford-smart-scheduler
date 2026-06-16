import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check existing subjects with similar names
const subjects = await p.subject.findMany({ orderBy: { name: "asc" } });
console.log("All subjects:", subjects.map(s => s.name));

// Create Resource Room Support if not exists
let rrSubject = await p.subject.findFirst({ where: { name: "Resource Room Support" } });
if (!rrSubject) {
  rrSubject = await p.subject.create({
    data: { name: "Resource Room Support", level: "BOTH", weeklyFrequency: 2, defaultDuration: "SIXTY" },
  });
  console.log("✅ Created subject: Resource Room Support");
} else {
  console.log("Subject exists:", rrSubject.name);
}

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Conrado" } } });
const room18 = await p.room.findFirst({ where: { name: { contains: "18" } } });

// TUE and WED at 13:15
for (const day of [2, 3]) {
  const tb = await p.timeBlock.findFirst({ where: { dayOfWeek: day, startTime: "13:15", level: { in: ["SECONDARY","BOTH"] } } });
  const existing = await p.assignment.findFirst({
    where: { teacherId: teacher.id, timeBlockId: tb?.id, subjectId: rrSubject.id },
  });
  if (!existing && tb) {
    await p.assignment.create({
      data: { teacherId: teacher.id, subjectId: rrSubject.id, gradeId: null, roomId: room18?.id ?? null, timeBlockId: tb.id, status: "CONFIRMED" },
    });
    console.log(`✅ Created: Day${day} 13:15 Resource Room Support`);
  }
}

await p.$disconnect();
