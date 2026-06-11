import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];

const grades = await p.grade.findMany({ orderBy: [{ name: "asc" }, { section: "asc" }] });
console.log("ALL GRADES:");
for (const g of grades) {
  console.log(`  ${g.id.slice(0,8)} | ${g.name}${g.section ?? ""} | ${g.level}`);
}

// Check 6A
const grade6A = grades.find(g => g.name === "6" && g.section === "A");
if (!grade6A) { console.log("\nGrade 6A NOT FOUND"); await p.$disconnect(); process.exit(); }

const assignments = await p.assignment.findMany({
  where: { gradeId: grade6A.id },
  include: { teacher: true, subject: true, room: true, timeBlock: true },
  orderBy: [{ timeBlock: { dayOfWeek: "asc" } }, { timeBlock: { startTime: "asc" } }],
});

console.log(`\n6A Assignments (${assignments.length} total):`);
for (const a of assignments) {
  console.log(`  Day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | ${a.subject.name.padEnd(20)} | ${a.teacher.name.padEnd(20)} | ${a.room?.name ?? "no room"}`);
}

await p.$disconnect();
