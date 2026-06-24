import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const users = await p.user.findMany({ orderBy: { role: "asc" } });
users.forEach(u => console.log(`[${u.role.padEnd(10)}] ${u.username}`));

await p.$disconnect();
