import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const b = await p.timeBlock.findMany({ where: { dayOfWeek: 4 }, orderBy: { startTime: "asc" } });
console.log("Thursday blocks:");
b.forEach(x => console.log(`  ${x.startTime}-${x.endTime} | ${x.level} | ${x.blockType}`));
await p.$disconnect();
