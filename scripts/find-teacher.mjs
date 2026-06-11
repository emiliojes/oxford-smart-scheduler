import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const r = await p.teacher.findMany({ where: { name: { contains: "mely", mode: "insensitive" } } });
console.log(r.length ? r : "Not found - listing all:");
if (!r.length) {
  const all = await p.teacher.findMany({ orderBy: { name: "asc" } });
  all.forEach(t => console.log(t.name));
}
await p.$disconnect();
