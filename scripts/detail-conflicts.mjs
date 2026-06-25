import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check each specific conflict in detail

// 1. Aracellys - 6B Social Studies vs 7B Soc. Science Mon 08:30
console.log("=== 1. Aracellys Dominguez Mon 08:30 ===");
const aracellys = await p.assignment.findMany({
  where: { teacher: { name: { contains: "Aracellys" } }, timeBlock: { dayOfWeek: 1, startTime: "08:30" } },
  include: { subject: true, grade: true, timeBlock: true }
});
aracellys.forEach(a => console.log(`  ${a.grade?.name}${a.grade?.section} | ${a.subject.name}`));

// 2. Manuel Abrego - P.E. 9B Fri 11:45
console.log("\n=== 2. Manuel Abrego Fri 11:45 ===");
const manuel = await p.assignment.findMany({
  where: { teacher: { name: { contains: "Manuel" } }, timeBlock: { dayOfWeek: 5, startTime: "11:45" } },
  include: { subject: true, grade: true, timeBlock: true }
});
manuel.forEach(a => console.log(`  ${a.grade?.name}${a.grade?.section} | ${a.subject.name} | ${a.timeBlock.startTime}-${a.timeBlock.endTime}`));

// 3. Maria Pitti - Fri 10:45
console.log("\n=== 3. Maria Pitti Fri 10:45 ===");
const pitti = await p.assignment.findMany({
  where: { teacher: { name: { contains: "Pitti" } }, timeBlock: { dayOfWeek: 5 } },
  include: { subject: true, grade: true, timeBlock: true },
  orderBy: { timeBlock: { startTime: "asc" } }
});
pitti.forEach(a => console.log(`  ${a.grade?.name}${a.grade?.section} | ${a.subject.name} | ${a.timeBlock.startTime}-${a.timeBlock.endTime}`));

// 4. Emilio - Thu
console.log("\n=== 4. Emilio Núñez Thu ===");
const emilio = await p.assignment.findMany({
  where: { teacher: { name: { contains: "Emilio" } }, timeBlock: { dayOfWeek: 4 } },
  include: { subject: true, grade: true, timeBlock: true },
  orderBy: { timeBlock: { startTime: "asc" } }
});
emilio.forEach(a => console.log(`  ${a.grade?.name}${a.grade?.section} | ${a.subject.name} | ${a.timeBlock.startTime}-${a.timeBlock.endTime} [${a.timeBlock.level}]`));

// 5. 4A - Thu 08:30
console.log("\n=== 5. Grade 4A Thu 08:30 ===");
const grade4a = await p.assignment.findMany({
  where: { grade: { name: "4", section: "A" }, timeBlock: { dayOfWeek: 4 } },
  include: { subject: true, teacher: true, timeBlock: true },
  orderBy: { timeBlock: { startTime: "asc" } }
});
grade4a.forEach(a => console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.subject.name} | ${a.teacher.name}`));

// 6. 5A - Tue 10:15
console.log("\n=== 6. Grade 5A Tue 10:15 ===");
const grade5a = await p.assignment.findMany({
  where: { grade: { name: "5", section: "A" }, timeBlock: { dayOfWeek: 2, startTime: "10:15" } },
  include: { subject: true, teacher: true, timeBlock: true }
});
grade5a.forEach(a => console.log(`  ${a.timeBlock.startTime} | ${a.subject.name} | ${a.teacher.name}`));

await p.$disconnect();
