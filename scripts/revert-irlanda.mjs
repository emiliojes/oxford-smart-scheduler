import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Irlanda" } } });
const deleted = await p.assignment.deleteMany({ where: { teacherId: teacher.id } });
console.log(`Deleted ${deleted.count} assignments for ${teacher.name}`);

await p.$disconnect();
console.log("Reverted!");
