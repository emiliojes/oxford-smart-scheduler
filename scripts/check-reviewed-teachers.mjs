import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

function secGroup(gradeName) {
  const n = Number(gradeName);
  if ([6,7,8].includes(n)) return "MIDDLE";
  if ([9,10,11,12].includes(n)) return "HIGH";
  return "OTHER";
}

const names = ["Irlanda", "Andrea", "Ricardo", "TBD", "Aristides"];

for (const name of names) {
  const teacher = await p.teacher.findFirst({ where: { name: { contains: name } } });
  if (!teacher) { console.log(`❓ Not found: ${name}`); continue; }

  const asgns = await p.assignment.findMany({
    where: { teacherId: teacher.id },
    include: { grade: true, timeBlock: true, subject: true },
    orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
  });

  // Check real conflicts
  const slotMap = {};
  for (const a of asgns) {
    if (!a.grade) continue;
    const sg = secGroup(a.grade.name);
    const key = `${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} [${sg}]`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push(`${a.grade.name}${a.grade.section ?? ""} ${a.subject.name}`);
  }

  const conflicts = Object.entries(slotMap).filter(([, v]) => v.length > 1);

  if (conflicts.length === 0) {
    console.log(`✅ ${teacher.name} (${asgns.length} assignments) — No conflicts`);
  } else {
    console.log(`⚠️  ${teacher.name} (${asgns.length} assignments) — ${conflicts.length} conflicts:`);
    conflicts.forEach(([slot, entries]) => console.log(`     ${slot}: ${entries.join(" | ")}`));
  }
}

await p.$disconnect();
