import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const maths = await p.subject.findMany({
  where: { name: { contains: "math", mode: "insensitive" } },
  orderBy: { name: "asc" }
});
console.log("Level           | Name");
console.log("----------------|-------------------");
maths.forEach(s => console.log(`${s.level.padEnd(16)}| ${s.name}`));

// Also check which grades currently use each Math subject
console.log("\nUsage in assignments:");
for (const s of maths) {
  const usedIn = await p.assignment.findMany({
    where: { subjectId: s.id },
    include: { grade: true },
    distinct: ["gradeId"]
  });
  const grades = usedIn.map(a => `${a.grade?.name ?? "?"}${a.grade?.section ?? ""}`).join(", ");
  if (grades) console.log(`  ${s.name.padEnd(12)} → ${grades}`);
}

await p.$disconnect();
