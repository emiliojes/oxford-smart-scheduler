import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const timeToMins = (t) => {
  const [h, m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
};

const teachers = await p.teacher.findMany({
  orderBy: { name: "asc" },
});

console.log("Teacher Weekly Hours Report\n" + "=".repeat(60));

const results = [];

for (const t of teachers) {
  const assignments = await p.assignment.findMany({
    where: { teacherId: t.id },
    include: { timeBlock: true, grade: true, subject: true },
  });

  // Only count assignments with a grade (ignore unassigned blocks)
  const withGrade = assignments.filter(a => a.grade);

  let totalMins = 0;
  const details = [];

  for (const a of withGrade) {
    const start = timeToMins(a.timeBlock.startTime);
    const end   = timeToMins(a.timeBlock.endTime);
    const mins  = end - start;
    if (mins > 0) {
      totalMins += mins;
      details.push({ day: a.timeBlock.dayOfWeek, start: a.timeBlock.startTime, end: a.timeBlock.endTime, mins, subject: a.subject.name, grade: `${a.grade.name}${a.grade.section ?? ""}` });
    }
  }

  const totalHrs = (totalMins / 60).toFixed(1);
  results.push({ name: t.name, hrs: parseFloat(totalHrs), assignments: withGrade.length });
}

// Sort by hours descending
results.sort((a, b) => b.hrs - a.hrs);

results.forEach(r => {
  const bar = "█".repeat(Math.round(r.hrs));
  const flag = r.hrs > 30 ? " ⚠️ HIGH" : r.hrs < 10 && r.hrs > 0 ? " ℹ️ LOW" : r.hrs === 0 ? " ❌ NONE" : "";
  console.log(`${r.name.padEnd(28)} ${String(r.hrs).padStart(5)}h  (${r.assignments} classes)${flag}`);
});

console.log(`\nTotal teachers: ${results.length}`);
console.log(`With 0h: ${results.filter(r => r.hrs === 0).length}`);
console.log(`>30h:    ${results.filter(r => r.hrs > 30).length}`);
console.log(`10-30h:  ${results.filter(r => r.hrs >= 10 && r.hrs <= 30).length}`);
console.log(`<10h:    ${results.filter(r => r.hrs > 0 && r.hrs < 10).length}`);

await p.$disconnect();
