import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const irlanda = await p.teacher.findFirst({ where: { name: { contains: "Irlanda" } } });
const grade12A = await p.grade.findFirst({ where: { name: "12", section: "A" } });
const ROOM22 = "cmq5x9vhp0002pr5qhh36eume";

// Find Homeroom subject
const homeroom = await p.subject.findFirst({ where: { name: "Homeroom" } });
console.log(`Homeroom subject: ${homeroom?.name} (${homeroom?.id})`);

// Check existing homeroom assignments for 12A
const existing = await p.assignment.findMany({
  where: { gradeId: grade12A.id, subject: { name: "Homeroom" } },
  include: { teacher: true, timeBlock: true },
});
console.log(`Existing Homeroom assignments for 12A: ${existing.length}`);
for (const a of existing) {
  console.log(`  ${a.timeBlock.startTime} Teacher: ${a.teacher?.name}`);
  // Update teacher to Irlanda
  await p.assignment.update({ where: { id: a.id }, data: { teacherId: irlanda.id, roomId: ROOM22 } });
  console.log(`  → Updated to Irlanda`);
}

// If no homeroom assignment exists, find MON 07:30 timeblock and create one
if (existing.length === 0) {
  const tb = await p.timeBlock.findFirst({
    where: { dayOfWeek: 1, startTime: "07:30", blockType: "CLASS", level: "SECONDARY" },
  });
  if (tb) {
    await p.assignment.create({
      data: { teacherId: irlanda.id, gradeId: grade12A.id, subjectId: homeroom.id, timeBlockId: tb.id, roomId: ROOM22 },
    });
    console.log(`Created Homeroom assignment for 12A → Irlanda`);
  }
}

await p.$disconnect();
console.log("Done!");
