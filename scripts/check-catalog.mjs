import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teachers = await p.teacher.findMany({ orderBy: { name: "asc" } });
console.log("TEACHERS:");
for (const t of teachers) console.log(`  ${t.id.slice(0,8)} | ${t.name}`);

const subjects = await p.subject.findMany({ orderBy: { name: "asc" } });
console.log("\nSUBJECTS:");
for (const s of subjects) console.log(`  ${s.id.slice(0,8)} | ${s.name}`);

const rooms = await p.room.findMany({ orderBy: { name: "asc" } });
console.log("\nROOMS:");
for (const r of rooms) console.log(`  ${r.id.slice(0,8)} | ${r.name}`);

// TimeBlocks SECONDARY day 1
const tbs = await p.timeBlock.findMany({ where: { level: "SECONDARY", dayOfWeek: 1, blockType: "CLASS" }, orderBy: { startTime: "asc" } });
console.log("\nSECONDARY CLASS TimeBlocks (day 1):");
for (const b of tbs) console.log(`  ${b.id.slice(0,8)} | ${b.startTime} - ${b.endTime}`);

await p.$disconnect();
