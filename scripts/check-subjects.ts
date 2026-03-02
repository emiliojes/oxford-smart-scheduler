import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
const prisma = new PrismaClient();
async function main() {
  const csv = fs.readFileSync("schedules-import-v2.csv", "utf-8");
  const csvSubjects = [...new Set(csv.split("\n").slice(1).map(l => l.split(",")[1]).filter(Boolean))].sort();
  const dbSubjects = await prisma.subject.findMany({ select: { name: true } });
  const dbNames = new Set(dbSubjects.map(s => s.name));
  console.log("=== Missing in DB ===");
  for (const s of csvSubjects) {
    if (!dbNames.has(s)) console.log(" MISSING:", s);
  }
  console.log("=== All DB subjects ===");
  [...dbNames].sort().forEach(n => console.log(" ", n));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
