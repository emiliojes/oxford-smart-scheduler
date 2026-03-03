import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Fix PRIMARY 12:30 endTime: 13:15 -> 13:30 (Excel shows 12:30-1:30)
  const r1 = await prisma.timeBlock.updateMany({
    where: { startTime: "12:30", endTime: "13:15", level: "PRIMARY" },
    data: { endTime: "13:30", duration: "60" },
  });
  console.log(`Fixed PRIMARY 12:30 endTime -> 13:30: ${r1.count} rows`);

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
