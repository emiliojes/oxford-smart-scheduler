import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const timeToMins = (t) => {
  const [h, m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
};
const fmtH = (mins) => (mins / 60).toFixed(2) + "h";

const DAY = ["", "Lun", "Mar", "Mié", "Jue", "Vie"];

const name = "Andrea Concepcion";

const teacher = await p.teacher.findFirst({ where: { name: { contains: name } } });
if (!teacher) { console.log("Teacher not found"); process.exit(1); }

const assignments = await p.assignment.findMany({
  where: {
    teacherId: teacher.id,
    timeBlock: { level: { in: ["LOW_SECONDARY", "SECONDARY"] } },
    grade: { isNot: null },
  },
  include: { timeBlock: true, grade: true, subject: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

console.log(`\n${teacher.name} — Middle/High assignments: ${assignments.length}\n`);

let grandTotal = 0;
const byDay = {};
for (const a of assignments) {
  const d = a.timeBlock.dayOfWeek;
  if (!byDay[d]) byDay[d] = [];
  byDay[d].push(a);
}

for (const day of [1, 2, 3, 4, 5]) {
  const arr = byDay[day] || [];
  let dayMins = 0;
  if (arr.length === 0) continue;
  console.log(`── ${DAY[day]} ──`);
  for (const a of arr) {
    const start = timeToMins(a.timeBlock.startTime);
    const end   = timeToMins(a.timeBlock.endTime);
    const mins  = end - start;
    dayMins += mins;
    console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime}  (${mins}min)  ${a.grade.name}${a.grade.section ?? ""} ${a.subject.name}  [${a.timeBlock.level}]`);
  }
  console.log(`  Day total: ${fmtH(dayMins)}  (${dayMins} min)\n`);
  grandTotal += dayMins;
}

console.log(`Script total:  ${fmtH(grandTotal)}  (${grandTotal} min)`);
console.log(`UI shows:      25h  (1500 min)`);
console.log(`Difference:    ${fmtH(grandTotal - 1500)}`);

await p.$disconnect();
