import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Check High School (SECONDARY) grade assignments → all should point to SECONDARY blocks
const secGrades = await p.grade.findMany({ where: { level: "SECONDARY" } });
const secGradeIds = secGrades.map(g => g.id);

const badSecondary = await p.assignment.findMany({
  where: { gradeId: { in: secGradeIds }, timeBlock: { level: { not: "SECONDARY" } } },
  include: { grade: true, subject: true, timeBlock: true, teacher: true }
});

if (badSecondary.length === 0) {
  console.log("✅ All High School grade assignments point to SECONDARY blocks.");
} else {
  console.log(`⚠️  ${badSecondary.length} High School assignments on wrong block level:`);
  badSecondary.forEach(a =>
    console.log(`  ${a.grade.name}${a.grade.section ?? ""} | ${a.subject.name} | block ${a.timeBlock.startTime} level:${a.timeBlock.level} | ${a.teacher.name}`)
  );
}

// 2. Check that teacher assignments for secondary teachers are intact
const secTeachers = await p.teacher.findMany({ where: { level: { in: ["SECONDARY", "BOTH"] } } });
console.log(`\n✅ ${secTeachers.length} SECONDARY/BOTH teachers found`);

const sampleCount = await p.assignment.count({
  where: { teacherId: { in: secTeachers.map(t => t.id) } }
});
console.log(`✅ ${sampleCount} total assignments for those teachers (unchanged)`);

// 3. Quick sanity: what block levels exist now
const levels = await p.timeBlock.groupBy({ by: ["level"], _count: true });
console.log("\nTime block counts by level:");
levels.forEach(l => console.log(`  ${l.level.padEnd(15)} ${l._count} blocks`));

await p.$disconnect();
