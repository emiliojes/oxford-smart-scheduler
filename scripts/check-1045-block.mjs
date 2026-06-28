import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const blocks = await prisma.timeBlock.findMany({
  where: { startTime: "10:45" },
  orderBy: [{ dayOfWeek: "asc" }, { level: "asc" }],
});

console.log("=== TIME BLOCKS AT 10:45 ===");
const days = ["","Mon","Tue","Wed","Thu","Fri"];
for (const b of blocks) {
  console.log(`  id=${b.id} | ${days[b.dayOfWeek]} | ${b.startTime}-${b.endTime} | duration=${b.duration} | type=${b.blockType} | level=${b.level}`);
}

await prisma.$disconnect();
