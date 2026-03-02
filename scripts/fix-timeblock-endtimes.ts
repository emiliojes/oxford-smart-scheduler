import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // PRIMARY 13:15 was created with endTime 13:50 (original PRIMARY slot),
  // but it should match SECONDARY's 13:15-14:15 for mixed-level teachers.
  const updated = await prisma.timeBlock.updateMany({
    where: { startTime: "13:15", endTime: "13:50", level: "PRIMARY" },
    data: { endTime: "14:15", duration: "60" },
  });
  console.log(`Updated PRIMARY 13:15 endTime 13:50->14:15: ${updated.count} rows`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
