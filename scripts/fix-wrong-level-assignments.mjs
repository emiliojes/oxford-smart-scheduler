import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const secGrades = await p.grade.findMany({ where: { level: "SECONDARY" } });
const secGradeIds = secGrades.map(g => g.id);

const bad = await p.assignment.findMany({
  where: { gradeId: { in: secGradeIds }, timeBlock: { level: { not: "SECONDARY" } } },
  include: { grade: true, subject: true, timeBlock: true, teacher: true }
});

console.log(`Found ${bad.length} High School assignments on wrong block level:\n`);

let fixed = 0, skipped = 0;
for (const a of bad) {
  // Find the correct SECONDARY block: same dayOfWeek, same startTime (or closest)
  // Special case: 13:00 LOW_SECONDARY → move to 13:15 SECONDARY
  const targetStart = a.timeBlock.startTime === "13:00" ? "13:15" : a.timeBlock.startTime;

  const correctBlock = await p.timeBlock.findFirst({
    where: {
      level: "SECONDARY",
      dayOfWeek: a.timeBlock.dayOfWeek,
      startTime: targetStart,
      blockType: "CLASS"
    }
  });

  if (!correctBlock) {
    console.log(`⚠️  No SECONDARY block found for ${a.grade.name}${a.grade.section} ${a.subject.name} day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime}`);
    skipped++;
    continue;
  }

  await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: correctBlock.id } });
  console.log(`✅ ${a.grade.name}${a.grade.section} | ${a.subject.name} | ${a.timeBlock.startTime}→${targetStart} [${a.timeBlock.level}→SECONDARY] (${a.teacher.name})`);
  fixed++;
}

console.log(`\nFixed: ${fixed}  |  Skipped: ${skipped}`);
await p.$disconnect();
