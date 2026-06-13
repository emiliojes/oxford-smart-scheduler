import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teachers = await p.teacher.findMany({ orderBy: { name: "asc" } });

console.log("Teachers with BOTH Middle and High assignments:\n");
for (const t of teachers) {
  const asgns = await p.assignment.findMany({
    where: { teacherId: t.id },
    include: { grade: true },
  });
  const middle = asgns.filter(a => [6,7,8].includes(Number(a.grade?.name)));
  const high   = asgns.filter(a => [9,10,11,12].includes(Number(a.grade?.name)));
  if (middle.length > 0 && high.length > 0) {
    const midGrades = [...new Set(middle.map(a => `${a.grade.name}${a.grade.section}`))].join(", ");
    const highGrades = [...new Set(high.map(a => `${a.grade.name}${a.grade.section}`))].join(", ");
    console.log(`  ${t.name}`);
    console.log(`    Middle: ${midGrades} (${middle.length} slots)`);
    console.log(`    High:   ${highGrades} (${high.length} slots)`);
  }
}

await p.$disconnect();
