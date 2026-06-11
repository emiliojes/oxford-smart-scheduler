/**
 * Reassign Math teacher for grades 9A, 9B, 11A, 11B, 12A → Irlanda Tuñon
 * Also reassign Thinking & Skills for 11A and 11B on Thursdays → Irlanda Tuñon
 * Also reassign Homeroom 12A → Irlanda Tuñon
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const irlanda = await p.teacher.findFirst({ where: { name: { contains: "Irlanda" } } });
console.log(`Irlanda id: ${irlanda.id}`);

const gradeNames = [
  { name: "9",  section: "A" },
  { name: "9",  section: "B" },
  { name: "11", section: "A" },
  { name: "11", section: "B" },
  { name: "12", section: "A" },
];

const mathSubjects = ["Math 9","Math 10","Math 11","Math 12","Math","Maths"];
const thinkingSubject = "Thinking and Skills";
const homeroomSubject = "Homeroom";

let total = 0;

for (const { name, section } of gradeNames) {
  const grade = await p.grade.findFirst({ where: { name, section } });
  if (!grade) { console.log(`Grade ${name}${section} not found`); continue; }

  // Update Math assignments
  const mathAsgns = await p.assignment.findMany({
    where: { gradeId: grade.id, subject: { name: { in: mathSubjects } } },
    include: { subject: true, timeBlock: true },
  });
  for (const a of mathAsgns) {
    await p.assignment.update({ where: { id: a.id }, data: { teacherId: irlanda.id } });
    total++;
  }
  console.log(`  Grade ${name}${section}: updated ${mathAsgns.length} Math assignments`);

  // Update Thinking & Skills (only 11A and 11B)
  if (["11"].includes(name)) {
    const tsAsgns = await p.assignment.findMany({
      where: { gradeId: grade.id, subject: { name: thinkingSubject } },
      include: { timeBlock: true },
    });
    for (const a of tsAsgns) {
      await p.assignment.update({ where: { id: a.id }, data: { teacherId: irlanda.id } });
      total++;
    }
    console.log(`  Grade ${name}${section}: updated ${tsAsgns.length} Thinking & Skills assignments`);
  }

  // Update Homeroom for 12A
  if (name === "12" && section === "A") {
    const hrAsgns = await p.assignment.findMany({
      where: { gradeId: grade.id, subject: { name: homeroomSubject } },
    });
    for (const a of hrAsgns) {
      await p.assignment.update({ where: { id: a.id }, data: { teacherId: irlanda.id } });
      total++;
    }
    console.log(`  Grade 12A: updated ${hrAsgns.length} Homeroom assignments`);
  }
}

console.log(`\nTotal updated: ${total} assignments → Irlanda Tuñon`);
await p.$disconnect();
console.log("Done!");
