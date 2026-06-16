import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

// Check all grade 8 assignments and which timeblock level they use
const grades8 = await p.grade.findMany({ where: { name: "8" } });
console.log("Grade 8 grades:", grades8.map(g => `${g.name}${g.section??""} (${g.level})`));

for (const grade of grades8) {
  const asgns = await p.assignment.findMany({
    where: { gradeId: grade.id },
    include: { timeBlock: true, teacher: true, subject: true },
    orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
  });
  console.log(`\n=== Grade ${grade.name}${grade.section??""} (${asgns.length} assignments) ===`);
  for (const a of asgns) {
    const flag = a.timeBlock.level === "SECONDARY" && ["10:45","11:45","13:15","14:15"].includes(a.timeBlock.startTime) ? " ⚠️ HIGH slot" : "";
    const flag2 = a.timeBlock.level === "LOW_SECONDARY" ? " ✅ MID slot" : "";
    console.log(`  ${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime} [${a.timeBlock.level}] ${a.subject.name} — ${a.teacher.name}${flag}${flag2}`);
  }
}

await p.$disconnect();
