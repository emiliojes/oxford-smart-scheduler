import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Fix 1: Manuel Abrego - 9A P.E. and 9B P.E. Fri 11:45 (joint class, same subject)
// Fix 2: Maria Pitti - 10A Spanish Fri 10:45 (stale conflict, no real overlap)

const targets = await p.assignment.findMany({
  where: {
    status: "CONFLICT",
    OR: [
      // Manuel Abrego P.E. joint class
      { teacher: { name: { contains: "Manuel" } }, subject: { name: "P.E." }, timeBlock: { dayOfWeek: 5 } },
      // Maria Pitti 10A Spanish
      { teacher: { name: { contains: "Pitti" } }, grade: { name: "10", section: "A" } },
    ]
  },
  include: { subject: true, grade: true, teacher: true, timeBlock: true, conflicts: true }
});

console.log(`Found ${targets.length} assignments to fix:\n`);
targets.forEach(a =>
  console.log(`  ${a.grade?.name}${a.grade?.section} | ${a.subject.name} | ${a.teacher.name} | day${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime}`)
);

for (const a of targets) {
  await p.conflict.deleteMany({ where: { assignmentId: a.id } });
  await p.assignment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
  console.log(`✅ Resolved: ${a.grade?.name}${a.grade?.section} | ${a.subject.name} | ${a.teacher.name}`);
}

const remaining = await p.conflict.count({ where: { resolved: false } });
console.log(`\nUnresolved conflicts remaining: ${remaining}`);

await p.$disconnect();
