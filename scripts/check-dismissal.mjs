import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// All DISMISSAL blocks
const dismissal = await prisma.timeBlock.findMany({
  where: { blockType: "DISMISSAL" },
  orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
});
const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri"];
console.log("=== DISMISSAL BLOCKS ===");
for (const b of dismissal) {
  console.log(`  ${days[b.dayOfWeek]} ${b.startTime}-${b.endTime} level=${b.level}`);
}

// Check if any CLASS assignments are scheduled AFTER a DISMISSAL block on the same day
console.log("\n=== CLASSES AFTER DISMISSAL ===");
let found = 0;
for (const dep of dismissal) {
  const classesAfter = await prisma.assignment.findMany({
    where: {
      timeBlock: {
        dayOfWeek: dep.dayOfWeek,
        startTime: { gt: dep.startTime },
        blockType: "CLASS",
      },
    },
    include: { teacher: true, subject: true, grade: true, timeBlock: true },
  });
  if (classesAfter.length > 0) {
    console.log(`\n  ${days[dep.dayOfWeek]} DISMISSAL at ${dep.startTime} → classes after:`);
    for (const a of classesAfter) {
      console.log(`    ${a.timeBlock.startTime}-${a.timeBlock.endTime} | Grade ${a.grade?.name ?? "?"}${a.grade?.section ?? ""} | ${a.subject.name} | ${a.teacher.name}`);
      found++;
    }
  }
}
if (found === 0) console.log("  None found.");

// Grade 6A full Friday with level info
console.log("\n=== GRADE 6A FRIDAY — ALL TIME BLOCKS ===");
const grade6A = await prisma.grade.findFirst({ where: { name: "6", section: "A" } });
console.log("Grade 6A level:", grade6A?.level);
const friday6A = await prisma.assignment.findMany({
  where: { gradeId: grade6A?.id, timeBlock: { dayOfWeek: 5 } },
  include: { subject: true, teacher: true, timeBlock: true },
  orderBy: { timeBlock: { startTime: "asc" } },
});
for (const a of friday6A) {
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} [${a.timeBlock.blockType}] ${a.subject.name} — ${a.teacher.name}`);
}

await prisma.$disconnect();
