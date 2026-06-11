import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const GRADES = ["8A","8B","9A","9B"];
const allGrades = await p.grade.findMany({ where: { level: "SECONDARY" } });
const gMap = Object.fromEntries(allGrades.map(g => [`${g.name}${g.section??""}`, g.id]));

for (const gk of GRADES) {
  const gid = gMap[gk];
  if (!gid) { console.log(`${gk}: NOT FOUND`); continue; }
  const asgns = await p.assignment.findMany({
    where: { gradeId: gid },
    include: { subject: true, teacher: true, timeBlock: true },
    orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
  });
  console.log(`\n=== ${gk} (${asgns.length} assignments) ===`);
  for (const a of asgns) {
    console.log(`  D${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | ${a.subject.name.padEnd(18)} | ${a.teacher.name}`);
  }
}
await p.$disconnect();
