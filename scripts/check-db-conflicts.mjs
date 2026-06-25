import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check assignments with CONFLICT status
const conflicted = await p.assignment.findMany({
  where: { status: "CONFLICT" },
  include: { subject: true, grade: true, teacher: true, timeBlock: true, conflicts: true }
});

console.log(`Assignments with CONFLICT status: ${conflicted.length}\n`);
conflicted.forEach(a => {
  const msgs = a.conflicts.map(c => c.description).join(" | ");
  console.log(`  ${a.grade?.name ?? "?"}${a.grade?.section ?? ""} | ${a.subject.name} | ${a.teacher.name} | day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} [block level: ${a.timeBlock.level}]`);
  console.log(`    → ${msgs}`);
});

// Count unresolved conflict records
const total = await p.conflict.count({ where: { resolved: false } });
console.log(`\nTotal unresolved Conflict records in DB: ${total}`);

await p.$disconnect();
