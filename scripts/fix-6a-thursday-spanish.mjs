import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Fix Aracellys level → BOTH (teaches Primary AND 6A)
const teacher = await p.teacher.findFirst({ where: { name: { contains: "racellys", mode: "insensitive" } } });
if (teacher) {
  await p.teacher.update({ where: { id: teacher.id }, data: { level: "BOTH" } });
  console.log(`✅ Aracellys level → BOTH`);
}

// 2. Move Spanish at 14:15 SECONDARY → 14:00 LOW_SECONDARY (Thursday, day 4)
const badBlock = await p.timeBlock.findFirst({ where: { dayOfWeek: 4, startTime: "14:15", level: "SECONDARY" } });
const goodBlock = await p.timeBlock.findFirst({ where: { dayOfWeek: 4, startTime: "14:00", level: "LOW_SECONDARY" } });

console.log("Bad block (14:15 SEC):", badBlock?.id);
console.log("Good block (14:00 LOW_SEC):", goodBlock?.id);

if (badBlock && goodBlock) {
  const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });
  const moved = await p.assignment.updateMany({
    where: { gradeId: grade.id, timeBlockId: badBlock.id },
    data: { timeBlockId: goodBlock.id }
  });
  console.log(`✅ Moved ${moved.count} assignment(s) from 14:15→14:00 (6A Thursday)`);
}

// 3. Fix remaining 6A assignments on wrong PRIMARY blocks → move to LOW_SECONDARY
const grade = await p.grade.findFirst({ where: { name: "6", section: "A" } });
const wrongMappings = [
  { day: 4, primaryStart: "07:30", correctStart: "07:30" },
  { day: 4, primaryStart: "08:30", correctStart: "08:30" },
  { day: 4, primaryStart: "09:45", correctStart: "09:45" },
];

for (const m of wrongMappings) {
  const primaryBlock = await p.timeBlock.findFirst({ where: { dayOfWeek: m.day, startTime: m.primaryStart, level: "PRIMARY" } });
  const lowSecBlock  = await p.timeBlock.findFirst({ where: { dayOfWeek: m.day, startTime: m.correctStart, level: "LOW_SECONDARY" } });
  if (primaryBlock && lowSecBlock) {
    const r = await p.assignment.updateMany({
      where: { gradeId: grade.id, timeBlockId: primaryBlock.id },
      data: { timeBlockId: lowSecBlock.id }
    });
    if (r.count > 0) console.log(`✅ Fixed ${m.primaryStart} day${m.day}: moved ${r.count} assignment(s) PRIMARY→LOW_SECONDARY`);
  } else {
    if (!lowSecBlock) console.log(`⚠️  No LOW_SECONDARY block at ${m.correctStart} day ${m.day}`);
  }
}

console.log("\n✅ Done. Verifying final 6A Thursday schedule:");
const final = await p.assignment.findMany({
  where: { gradeId: grade.id, timeBlock: { dayOfWeek: 4 } },
  include: { subject: true, teacher: true, timeBlock: true },
  orderBy: { timeBlock: { startTime: "asc" } }
});
final.forEach(a => console.log(`  ${a.timeBlock.startTime} | ${a.subject.name} | ${a.teacher.name} | ${a.timeBlock.level}`));

await p.$disconnect();
