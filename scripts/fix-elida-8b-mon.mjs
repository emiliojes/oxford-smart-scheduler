import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Elida" } } });
const grade8B = await p.grade.findFirst({ where: { name: "8", section: "B" } });

// MON 14:15 for grade 8B used SECONDARY slot — 8B is MIDDLE, should use LOW_SECONDARY 14:00
const wrongTB = await p.timeBlock.findFirst({ where: { dayOfWeek: 1, startTime: "14:15", level: { in: ["SECONDARY","BOTH"] } } });
const correctTB = await p.timeBlock.findFirst({ where: { dayOfWeek: 1, startTime: "14:00", level: { in: ["LOW_SECONDARY","BOTH"] } } });

const asgn = await p.assignment.findFirst({
  where: { teacherId: teacher.id, gradeId: grade8B.id, timeBlockId: wrongTB?.id },
});

if (asgn && correctTB) {
  await p.assignment.update({ where: { id: asgn.id }, data: { timeBlockId: correctTB.id } });
  console.log("✅ Fixed: MON 8B 14:15 (HIGH) → 14:00 LOW_SECONDARY");
} else {
  console.log("ℹ️  MON 8B — wrong:", !!asgn, "correct TB:", !!correctTB);
}

// Also check TUE 8:30 8B — 8:30 is shared SECONDARY block for both levels, that's correct
// Check WED 9:45 8B — 9:45 is shared SECONDARY block, correct

// FRI 12:00 8B — already LOW_SECONDARY ✅
// THU 12:00 8B — already LOW_SECONDARY ✅

await p.$disconnect();
