import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const blocks = await prisma.timeBlock.findMany({ orderBy: { startTime: "asc" } });
  console.log("startTime  endTime   duration  level");
  console.log("─".repeat(50));
  for (const b of blocks) {
    console.log(`${b.startTime.padEnd(10)} ${b.endTime.padEnd(10)} ${String(b.duration).padEnd(10)} ${b.level}`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
