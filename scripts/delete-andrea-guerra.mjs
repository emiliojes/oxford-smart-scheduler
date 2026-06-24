import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// STEP 1: List all teachers named "Andrea" – confirm before deleting
const andreas = await p.teacher.findMany({ where: { name: { contains: "Andrea", mode: "insensitive" } } });
console.log(`\nAll teachers with 'Andrea' in name (${andreas.length}):`);
andreas.forEach(t => console.log(`  [${t.level}] ${t.name}  id: ${t.id}`));

// STEP 2: Only target "Andrea Guerra" exactly
const target = andreas.find(t => t.name.trim().toLowerCase() === "andrea guerra");
if (!target) { console.log("\n⚠️  'Andrea Guerra' not found by exact match. Exiting safely."); await p.$disconnect(); process.exit(0); }

console.log(`\nTarget to delete: ${target.name} (${target.level})`);

const assignments = await p.assignment.findMany({
  where: { teacherId: target.id },
  include: { subject: true, grade: true, timeBlock: true },
});
console.log(`Assignments to delete (${assignments.length}):`);
assignments.forEach(a =>
  console.log(`  ${a.grade?.name ?? "?"}${a.grade?.section ?? ""} | ${a.subject.name} | day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime}`)
);

const deleted = await p.assignment.deleteMany({ where: { teacherId: target.id } });
console.log(`\n✅ Deleted ${deleted.count} assignments`);

await p.teacher.delete({ where: { id: target.id } });
console.log(`✅ Deleted teacher: ${target.name}`);

await p.$disconnect();
