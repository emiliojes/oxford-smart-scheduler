import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find grade 9B
const grade = await p.grade.findFirst({ where: { name: "9", section: "B" } });
console.log("Grade 9B:", grade ? `${grade.name}${grade.section} [level: ${grade.level}] id: ${grade.id}` : "NOT FOUND");

if (!grade) { await p.$disconnect(); process.exit(1); }

// All assignments for 9B
const asgns = await p.assignment.findMany({
  where: { gradeId: grade.id },
  include: { subject: true, teacher: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }]
});

console.log(`\nAll assignments for 9B (${asgns.length}):`);
asgns.forEach(a =>
  console.log(`  day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | ${a.subject.name.padEnd(16)} | ${a.teacher.name} | blockLevel:${a.timeBlock.level} | status:${a.status}`)
);

// Literature specifically
console.log("\nLiterature assignments for 9B:");
const lit = asgns.filter(a => a.subject.name.toLowerCase().includes("literature"));
lit.forEach(a =>
  console.log(`  day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | blockLevel:${a.timeBlock.level} | gradeLevel:${grade.level} | status:${a.status}`)
);

if (!lit.length) console.log("  ❌ None found");

await p.$disconnect();
