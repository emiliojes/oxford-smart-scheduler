import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const fixes = [
  // Omely teaches Primary (4B,5A,5B) AND Pre-Media (6A,6B) → BOTH
  { name: "Omely Rujano", level: "BOTH" },
  // Maria Pitti teaches only Pre-Media (7A,7B,8A) → BOTH (safe for future)
  { name: "Maria Pitti", level: "BOTH" },
];

for (const { name, level } of fixes) {
  const teacher = await p.teacher.findFirst({ where: { name: { contains: name, mode: "insensitive" } } });
  if (teacher) {
    await p.teacher.update({ where: { id: teacher.id }, data: { level } });
    console.log(`✅ ${teacher.name}: ${teacher.level} → ${level}`);
  } else {
    console.log(`⚠️  Not found: ${name}`);
  }
}

console.log("\n📋 Pre-Media Spanish teachers after fix:");
const spanishAssignments = await p.assignment.findMany({
  where: { subject: { name: "Spanish" }, grade: { level: "LOW_SECONDARY" } },
  include: { teacher: true, grade: true },
  orderBy: [{ grade: { name: "asc" } }, { grade: { section: "asc" } }]
});
const seen = new Set();
spanishAssignments.forEach(a => {
  const key = `${a.grade.name}${a.grade.section}-${a.teacher.name}`;
  if (!seen.has(key)) {
    seen.add(key);
    console.log(`  Grade ${a.grade.name}${a.grade.section} | ${a.teacher.name} (level: ${a.teacher.level})`);
  }
});

await p.$disconnect();
