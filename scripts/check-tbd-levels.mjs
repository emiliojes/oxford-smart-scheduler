import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const tbd = await p.teacher.findFirst({ where: { name: { contains: "TBD" } } });
const asgns = await p.assignment.findMany({ where: { teacherId: tbd.id }, include: { grade: true } });
const unique = [...new Map(asgns.map(a => [a.grade.name + a.grade.section, a.grade])).values()];
unique.forEach(g => console.log(`Grade ${g.name}${g.section} → level: ${g.level}`));
await p.$disconnect();
