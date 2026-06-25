import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const timeToMins = (t) => {
  const [h, m = "0"] = t.split(":");
  return parseInt(h) * 60 + parseInt(m);
};

const blocksOverlap = (b1, b2) => {
  if (b1.dayOfWeek !== b2.dayOfWeek) return false;
  const s1 = timeToMins(b1.startTime), e1 = timeToMins(b1.endTime);
  const s2 = timeToMins(b2.startTime), e2 = timeToMins(b2.endTime);
  return s1 < e2 && e1 > s2;
};

const teachers = await p.teacher.findMany({ orderBy: { name: "asc" } });
const allConflicts = [];

for (const teacher of teachers) {
  const assignments = await p.assignment.findMany({
    where: { teacherId: teacher.id },
    include: { subject: true, grade: true, timeBlock: true },
    orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }]
  });

  const withGrade = assignments.filter(a => a.grade);
  const byDay = {};
  withGrade.forEach(a => {
    const d = a.timeBlock.dayOfWeek;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(a);
  });

  const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];
  for (const day in byDay) {
    const arr = byDay[day];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a1 = arr[i], a2 = arr[j];
        if (blocksOverlap(a1.timeBlock, a2.timeBlock)) {
          if (a1.subject.id === a2.subject.id) continue; // joint class
          allConflicts.push(
            `[${days[parseInt(day)]}] ${teacher.name}: ` +
            `${a1.grade.name}${a1.grade.section||""} ${a1.subject.name} (${a1.timeBlock.startTime}-${a1.timeBlock.endTime}) ` +
            `vs ${a2.grade.name}${a2.grade.section||""} ${a2.subject.name} (${a2.timeBlock.startTime}-${a2.timeBlock.endTime})`
          );
        }
      }
    }
  }
}

console.log(`Total conflicts: ${allConflicts.length}\n`);
allConflicts.forEach((c, i) => console.log(`${i+1}. ${c}`));

await p.$disconnect();
