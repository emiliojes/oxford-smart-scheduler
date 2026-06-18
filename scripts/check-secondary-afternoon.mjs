import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const tbs = await p.timeBlock.findMany({
  where: { level: "SECONDARY", blockType: "CLASS", startTime: { gte: "12:00" } },
  select: { startTime: true, endTime: true },
  distinct: ["startTime"],
  orderBy: { startTime: "asc" },
});

console.log("SECONDARY afternoon CLASS slots:");
tbs.forEach(tb => console.log(tb.startTime + "-" + tb.endTime));

await p.$disconnect();
