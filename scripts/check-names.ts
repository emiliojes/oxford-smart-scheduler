import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const [subjects, grades, rooms, timeBlocks] = await Promise.all([
    p.subject.findMany({ select: { name: true, level: true }, orderBy: { name: "asc" } }),
    p.grade.findMany({ select: { name: true, section: true, level: true }, orderBy: { name: "asc" } }),
    p.room.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    p.timeBlock.findMany({ where: { blockType: "CLASS", dayOfWeek: 1 }, select: { startTime: true, level: true }, orderBy: { startTime: "asc" } }),
  ]);

  console.log("\n=== SUBJECTS (SECONDARY) ===");
  subjects.filter(s => s.level !== "PRIMARY").forEach(s => console.log(` "${s.name}" [${s.level}]`));

  console.log("\n=== GRADES SECONDARY ===");
  grades.filter(g => g.level === "SECONDARY").forEach(g => console.log(` name="${g.name}" section="${g.section}"`));

  console.log("\n=== ROOMS ===");
  rooms.forEach(r => console.log(` "${r.name}"`));

  console.log("\n=== TIME BLOCKS (Monday, CLASS) ===");
  timeBlocks.forEach(tb => console.log(` start="${tb.startTime}" level=${tb.level}`));
}

main().finally(() => p.$disconnect());
