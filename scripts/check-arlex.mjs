import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teachers = await p.teacher.findMany({ select: { name: true } });
console.log("All teachers:");
teachers.forEach(t => console.log(t.name));

const arlex = await p.teacher.findFirst({ where: { name: { contains: "Arlex" } } });
console.log("\nArlex:", arlex?.name || "NOT FOUND");

const andrea = await p.teacher.findFirst({ where: { name: { contains: "Andrea" } } });
console.log("Andrea:", andrea?.name || "NOT FOUND");

await p.$disconnect();
