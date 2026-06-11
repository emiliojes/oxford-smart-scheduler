/**
 * Reassign Biology teacher for grades 9A, 9B, 10A, 10B, 11A, 11B, 12A → Andrea Concepcion
 * Also update Homeroom 11A → Andrea (already done, but ensure room is correct)
 * Room: Room #20 (Planta Alta)
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });
console.log(`Andrea id: ${andrea.id}`);

const ROOM20 = "cmq5x9v5x0000pr5qvkpimgw6"; // Room #20 (Planta Alta)

const gradeNames = [
  { name: "9",  section: "A" },
  { name: "9",  section: "B" },
  { name: "10", section: "A" },
  { name: "10", section: "B" },
  { name: "11", section: "A" },
  { name: "11", section: "B" },
  { name: "12", section: "A" },
];

const bioSubjects = ["Biology"];
let total = 0;

for (const { name, section } of gradeNames) {
  const grade = await p.grade.findFirst({ where: { name, section } });
  if (!grade) { console.log(`Grade ${name}${section} not found`); continue; }

  const asgns = await p.assignment.findMany({
    where: { gradeId: grade.id, subject: { name: { in: bioSubjects } } },
    include: { subject: true, timeBlock: true },
  });
  for (const a of asgns) {
    await p.assignment.update({ where: { id: a.id }, data: { teacherId: andrea.id } });
    total++;
  }
  console.log(`  Grade ${name}${section}: updated ${asgns.length} Biology assignments`);
}

// Ensure Homeroom 11A is also Andrea with Room 20
const grade11A = await p.grade.findFirst({ where: { name: "11", section: "A" } });
const hrAsgns = await p.assignment.findMany({
  where: { gradeId: grade11A.id, subject: { name: "Homeroom" } },
});
for (const a of hrAsgns) {
  await p.assignment.update({ where: { id: a.id }, data: { teacherId: andrea.id } });
  total++;
}
console.log(`  Grade 11A: updated ${hrAsgns.length} Homeroom assignments`);

console.log(`\nTotal updated: ${total} → Andrea Concepcion`);
await p.$disconnect();
console.log("Done!");
