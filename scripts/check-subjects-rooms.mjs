import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log("Subjects:");
const subjects = await p.subject.findMany({ orderBy: { name: "asc" } });
subjects.forEach(s => console.log(`  ${s.id}  ${s.name}`));

console.log("\nRooms (Room 22):");
const rooms = await p.room.findMany({ where: { name: { contains: "22" } } });
rooms.forEach(r => console.log(`  ${r.id}  ${r.name}`));

console.log("\nGrades 9-12:");
const grades = await p.grade.findMany({ where: { name: { in: ["9","10","11","12"] } }, orderBy: [{ name: "asc" }, { section: "asc" }] });
grades.forEach(g => console.log(`  ${g.id}  Grade ${g.name}${g.section ?? ""}`));

await p.$disconnect();
