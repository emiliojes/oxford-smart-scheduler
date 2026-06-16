import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["","MON","TUE","WED","THU","FRI"];
const timeToMins = t => { const [h,m="0"]=t.split(":"); return parseInt(h)*60+parseInt(m); };

function secGroup(gradeName) {
  const n = Number(gradeName);
  if ([6,7,8].includes(n)) return "MIDDLE";
  if ([9,10,11,12].includes(n)) return "HIGH";
  return "OTHER";
}

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Maria" } } });
const asgns = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: { grade: true, timeBlock: true, subject: true },
  orderBy: [{ timeBlock: { dayOfWeek:"asc" } },{ timeBlock: { startTime:"asc" } }],
});

console.log(`${teacher.name} — ${asgns.length} assignments\n`);

// 1. Same-level same-slot conflicts
const slotMap = {};
for (const a of asgns) {
  if (!a.grade) continue;
  const sg = secGroup(a.grade.name);
  const key = `${DAYS[a.timeBlock.dayOfWeek]} ${a.timeBlock.startTime} [${sg}]`;
  if (!slotMap[key]) slotMap[key] = [];
  slotMap[key].push(`${a.grade.name}${a.grade.section??""}`);
}
const sameSlot = Object.entries(slotMap).filter(([,v])=>v.length>1);
if (sameSlot.length) {
  console.log("⚠️  SAME-LEVEL SAME-SLOT:");
  sameSlot.forEach(([k,v])=>console.log(`  ${k}: ${v.join(" | ")}`));
} else {
  console.log("✅ No same-level same-slot conflicts");
}

// 2. Time overlaps across levels (Middle vs High)
const overlaps = [];
const middleA = asgns.filter(a => secGroup(a.grade?.name) === "MIDDLE");
const highA   = asgns.filter(a => secGroup(a.grade?.name) === "HIGH");
for (const m of middleA) {
  for (const h of highA) {
    if (m.timeBlock.dayOfWeek !== h.timeBlock.dayOfWeek) continue;
    const mS=timeToMins(m.timeBlock.startTime), mE=timeToMins(m.timeBlock.endTime);
    const hS=timeToMins(h.timeBlock.startTime), hE=timeToMins(h.timeBlock.endTime);
    if (mS < hE && mE > hS) {
      overlaps.push(`  ⚠️  ${DAYS[m.timeBlock.dayOfWeek]}: MIDDLE ${m.timeBlock.startTime}-${m.timeBlock.endTime} (${m.grade.name}${m.grade.section??""}) overlaps HIGH ${h.timeBlock.startTime}-${h.timeBlock.endTime} (${h.grade.name}${h.grade.section??""})`);
    }
  }
}
if (overlaps.length) {
  console.log("\n⚠️  MIDDLE/HIGH TIME OVERLAPS:");
  [...new Set(overlaps)].forEach(o=>console.log(o));
} else {
  console.log("✅ No Middle/High time overlaps");
}

await p.$disconnect();
