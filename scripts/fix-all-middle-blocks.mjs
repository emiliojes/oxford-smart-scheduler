import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// All Middle School grades
const middleGrades = [
  { name: "6", section: "A" },
  { name: "6", section: "B" },
  { name: "7", section: "A" },
  { name: "7", section: "B" },
  { name: "8", section: "A" },
  { name: "8", section: "B" },
];

const remapStart = {
  "11:45": "12:00",
  "13:15": "13:00",
  "14:15": "14:00",
};

let totalFixed = 0;
let totalWrong = 0;

for (const g of middleGrades) {
  const grade = await p.grade.findFirst({ where: { name: g.name, section: g.section } });
  if (!grade) { console.log(`❌ Grade ${g.name}${g.section} not found`); continue; }

  const assignments = await p.assignment.findMany({
    where: { gradeId: grade.id },
    include: { subject: true, timeBlock: true }
  });

  let gradeFixed = 0;
  let gradeWrong = 0;

  for (const a of assignments) {
    const tb = a.timeBlock;

    // Fix Hour 4: 10:45-11:45 SECONDARY → 10:45-11:30 LOW_SECONDARY
    if (tb.startTime === "10:45" && tb.endTime === "11:45") {
      const correct = await p.timeBlock.findFirst({
        where: { level: "LOW_SECONDARY", dayOfWeek: tb.dayOfWeek, startTime: "10:45", endTime: "11:30" }
      });
      if (correct) {
        await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: correct.id } });
        gradeFixed++;
      } else {
        gradeWrong++;
      }
      continue;
    }

    // Fix Hours 5,6,7 wrong start times
    const correctStart = remapStart[tb.startTime];
    if (!correctStart) continue;

    const correct = await p.timeBlock.findFirst({
      where: { level: "LOW_SECONDARY", dayOfWeek: tb.dayOfWeek, startTime: correctStart }
    });
    if (correct) {
      await p.assignment.update({ where: { id: a.id }, data: { timeBlockId: correct.id } });
      gradeFixed++;
    } else {
      gradeWrong++;
    }
  }

  const status = gradeFixed > 0 ? `✅ Fixed ${gradeFixed}` : `✅ Already correct`;
  const wrongNote = gradeWrong > 0 ? ` | ❌ ${gradeWrong} could not fix` : "";
  console.log(`Grade ${g.name}${g.section}: ${status}${wrongNote}`);
  totalFixed += gradeFixed;
  totalWrong += gradeWrong;
}

console.log(`\n📊 TOTAL: Fixed ${totalFixed} assignments across all Middle School grades`);
if (totalWrong > 0) console.log(`❌ ${totalWrong} could not be fixed (missing LOW_SECONDARY blocks)`);

await p.$disconnect();
