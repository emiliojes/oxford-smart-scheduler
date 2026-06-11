import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rooms = await p.room.findMany({ orderBy: { name: "asc" } });
rooms.forEach(r => console.log(`${r.id}  ${r.name}`));
await p.$disconnect();
