import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Find DEPARTURE time blocks
  const departureBlocks = await prisma.timeBlock.findMany({
    where: { blockType: "DEPARTURE" },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  console.log("\n=== DEPARTURE TIME BLOCKS ===");
  for (const b of departureBlocks) {
    const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];
    console.log(`  ${days[b.dayOfWeek]} ${b.startTime}-${b.endTime} [${b.level}]`);
  }

  // For each DEPARTURE block, find any CLASS assignments scheduled AFTER it on the same day
  console.log("\n=== CLASSES SCHEDULED AFTER DEPARTURE ===");
  let found = 0;
  for (const dep of departureBlocks) {
    const classesAfter = await prisma.assignment.findMany({
      where: {
        timeBlock: {
          dayOfWeek: dep.dayOfWeek,
          startTime: { gt: dep.startTime },
          blockType: "CLASS",
        },
      },
      include: {
        teacher: true,
        subject: true,
        grade: true,
        timeBlock: true,
      },
    });
    if (classesAfter.length > 0) {
      const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      console.log(`\n  ${days[dep.dayOfWeek]} — DEPARTURE at ${dep.startTime}, classes after:`);
      for (const a of classesAfter) {
        console.log(`    ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.grade?.name ?? "?"} | ${a.subject.name} | ${a.teacher.name}`);
        found++;
      }
    }
  }
  if (found === 0) console.log("  None found.");

  // Also check specifically Grade 6A on Friday
  console.log("\n=== GRADE 6A FRIDAY SCHEDULE ===");
  const grade6A = await prisma.grade.findFirst({ where: { name: "6", section: "A" } });
  if (grade6A) {
    const friday6A = await prisma.assignment.findMany({
      where: { gradeId: grade6A.id, timeBlock: { dayOfWeek: 5 } },
      include: { subject: true, teacher: true, timeBlock: true },
      orderBy: { timeBlock: { startTime: "asc" } },
    });
    for (const a of friday6A) {
      console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} [${a.timeBlock.blockType}] ${a.subject.name} — ${a.teacher.name}`);
    }
  } else {
    console.log("  Grade 6A not found.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
