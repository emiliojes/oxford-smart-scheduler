import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const subjects = await p.subject.findMany({ orderBy: { name: "asc" } });

console.log("📋 ALL SUBJECTS:\n");
subjects.forEach(s => console.log(`  [${s.id}] "${s.name}" | level: ${s.level}`));

// Find exact duplicates
const nameMap = {};
for (const s of subjects) {
  const key = s.name.toLowerCase().trim();
  if (!nameMap[key]) nameMap[key] = [];
  nameMap[key].push(s);
}

console.log("\n❌ EXACT DUPLICATES:");
let hasDups = false;
for (const [name, list] of Object.entries(nameMap)) {
  if (list.length > 1) {
    hasDups = true;
    console.log(`  "${list[0].name}" appears ${list.length} times:`);
    for (const s of list) {
      const count = await p.assignment.count({ where: { subjectId: s.id } });
      console.log(`    [${s.id}] level: ${s.level} | assignments: ${count}`);
    }
  }
}
if (!hasDups) console.log("  None");

// Find near-duplicates (whitespace/case differences)
console.log("\n⚠️  NEAR-DUPLICATES (case/space):");
const normalized = subjects.map(s => ({ ...s, norm: s.name.toLowerCase().replace(/\s+/g, " ").trim() }));
const normMap = {};
for (const s of normalized) {
  if (!normMap[s.norm]) normMap[s.norm] = [];
  normMap[s.norm].push(s);
}
let hasNear = false;
for (const [norm, list] of Object.entries(normMap)) {
  if (list.length > 1 && !nameMap[norm]?.length > 1) {
    hasNear = true;
    console.log(`  Normalized "${norm}":`);
    for (const s of list) {
      const count = await p.assignment.count({ where: { subjectId: s.id } });
      console.log(`    [${s.id}] "${s.name}" | level: ${s.level} | assignments: ${count}`);
    }
  }
}
if (!hasNear) console.log("  None");

await p.$disconnect();
