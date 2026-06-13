import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// For each suspicious block, show which grades use it
const suspicious = ["12:00", "13:00", "14:00", "10:45"];

for (const st of suspicious) {
  const blocks = await p.timeBlock.findMany({
    where: { startTime: st, level: { in: ["SECONDARY", "BOTH"] } },
  });
  for (const b of blocks) {
    const asgns = await p.assignment.findMany({
      where: { timeBlockId: b.id },
      include: { grade: true },
      take: 3,
    });
    const grades = asgns.map(a => `${a.grade?.name}${a.grade?.section ?? ""}`).join(", ");
    console.log(`${b.startTime}-${b.endTime} id:${b.id.slice(-6)} → grades: ${grades || "none"}`);
  }
  console.log();
}

await p.$disconnect();
