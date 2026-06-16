import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "MON", "TUE", "WED", "THU", "FRI"];

function secGroup(gradeName) {
  const n = Number(gradeName);
  if ([6,7,8].includes(n)) return "MIDDLE";
  if ([9,10,11,12].includes(n)) return "HIGH";
  return "OTHER";
}

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Emilio" } } });
const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true, subject: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

console.log(`${teacher.name} — ${asgns.length} assignments\n`);

// Show full schedule with level
for (const a of asgns) {
  const sg = secGroup(a.grade?.name);
  console.log(`  ${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime}-${a.timeBlock.endTime}  [${sg}]  Grade ${a.grade?.name}${a.grade?.section??""} — ${a.subject.name}${a.note ? " ("+a.note+")" : ""}`);
}

// Find overlapping slots between Middle and High on the same day
console.log("\n=== OVERLAPS (Middle slot time overlaps with a High slot) ===\n");

const middleAsgns = asgns.filter(a => secGroup(a.grade?.name) === "MIDDLE");
const highAsgns   = asgns.filter(a => secGroup(a.grade?.name) === "HIGH");

for (const m of middleAsgns) {
  for (const h of highAsgns) {
    if (m.timeBlock.dayOfWeek !== h.timeBlock.dayOfWeek) continue;
    const mStart = m.timeBlock.startTime;
    const mEnd   = m.timeBlock.endTime;
    const hStart = h.timeBlock.startTime;
    const hEnd   = h.timeBlock.endTime;
    // Check time overlap
    if (mStart < hEnd && mEnd > hStart) {
      console.log(`  ⚠️  ${DAYS[m.timeBlock.dayOfWeek]}: MIDDLE ${mStart}-${mEnd} (${m.grade?.name}${m.grade?.section??""}) overlaps HIGH ${hStart}-${hEnd} (${h.grade?.name}${h.grade?.section??""})`);
    }
  }
}

await p.$disconnect();
