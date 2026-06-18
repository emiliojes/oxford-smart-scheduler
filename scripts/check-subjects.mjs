import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const subjects = await p.subject.findMany({ select: { name: true }, orderBy: { name: "asc" } });
console.log("All subjects:");
subjects.forEach(s => console.log(s.name));

await p.$disconnect();
