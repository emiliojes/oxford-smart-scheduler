import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const tbs = await prisma.timeBlock.findMany({ orderBy: [{ level: "asc" }, { dayOfWeek: "asc" }, { startTime: "asc" }] });
  // Show unique startTime+blockType+level combos (day 1 only to avoid repetition)
  const day1 = tbs.filter(t => t.dayOfWeek === 1);
  console.log("Day 1 time blocks:");
  day1.forEach(t => console.log(`  ${t.level.padEnd(14)} ${t.startTime} - ${t.endTime}  [${t.blockType}]  id=${t.id}`));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
