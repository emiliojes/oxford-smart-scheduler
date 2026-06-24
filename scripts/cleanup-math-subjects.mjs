import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log("=== MATH SUBJECTS CLEANUP ===\n");

// The two plain "Math" subjects
const [mathA, mathB] = await p.subject.findMany({ where: { name: "Math" }, orderBy: { level: "asc" } });
const mathPRI = [mathA, mathB].find(s => s.level === "PRIMARY");  // used by High School (wrongly)
const mathSEC = [mathA, mathB].find(s => s.level === "SECONDARY"); // used by Pre-Media (wrongly)

console.log(`Math PRIMARY id: ${mathPRI.id}  (will become SECONDARY / Media)`);
console.log(`Math SECONDARY id: ${mathSEC.id}  (will become LOW_SECONDARY / Pre-Media)\n`);

// STEP 1 — Fix levels on the two main Math subjects
await p.subject.update({ where: { id: mathSEC.id }, data: { level: "LOW_SECONDARY" } });
console.log(`✅ "Math" SECONDARY → LOW_SECONDARY  (Pre-Media 6°–8°)`);

await p.subject.update({ where: { id: mathPRI.id }, data: { level: "SECONDARY" } });
console.log(`✅ "Math" PRIMARY   → SECONDARY       (Media 9°–12°)\n`);

const mathLowId  = mathSEC.id;  // now LOW_SECONDARY
const mathHighId = mathPRI.id;  // now SECONDARY

// STEP 2 — Move 8A / 8B (LOW_SECONDARY grades) off the now-SECONDARY Math
const lowSecGrades = await p.grade.findMany({ where: { level: "LOW_SECONDARY" } });
const lowSecIds = lowSecGrades.map(g => g.id);

const wrongHigh = await p.assignment.findMany({
  where: { subjectId: mathHighId, gradeId: { in: lowSecIds } },
  include: { grade: true }
});
if (wrongHigh.length) {
  await p.assignment.updateMany({
    where: { subjectId: mathHighId, gradeId: { in: lowSecIds } },
    data: { subjectId: mathLowId }
  });
  const names = wrongHigh.map(a => `${a.grade.name}${a.grade.section ?? ""}`).join(", ");
  console.log(`✅ Moved ${wrongHigh.length} assignments (${names}) → LOW_SECONDARY Math\n`);
}

// STEP 3 — Migrate numbered Math + Maths, then delete them
const toDelete = await p.subject.findMany({
  where: { name: { in: ["Math 6","Math 7","Math 8","Math 10","Math 11","Math 12","Maths"] } }
});

for (const sub of toDelete) {
  const asgns = await p.assignment.findMany({
    where: { subjectId: sub.id },
    include: { grade: true }
  });
  for (const a of asgns) {
    const target = a.grade?.level === "LOW_SECONDARY" ? mathLowId : mathHighId;
    await p.assignment.update({ where: { id: a.id }, data: { subjectId: target } });
    console.log(`  Migrated ${a.grade?.name}${a.grade?.section ?? ""} (${sub.name}) → ${a.grade?.level === "LOW_SECONDARY" ? "LOW_SEC" : "SEC"} Math`);
  }
  await p.subject.delete({ where: { id: sub.id } });
  console.log(`  🗑  Deleted subject "${sub.name}"`);
}

// STEP 4 — Summary
console.log("\n=== RESULT ===");
const finalMaths = await p.subject.findMany({
  where: { name: { contains: "math", mode: "insensitive" } },
  orderBy: { level: "asc" }
});
finalMaths.forEach(s => console.log(`  [${s.level.padEnd(14)}] ${s.name}`));

console.log("\nAssignment counts:");
for (const s of finalMaths) {
  const count = await p.assignment.count({ where: { subjectId: s.id } });
  console.log(`  ${s.name} (${s.level}): ${count} assignments`);
}

await p.$disconnect();
