import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const rooms = await prisma.room.findMany({ orderBy: { name: "asc" } });
  rooms.forEach(r => console.log(`${r.id}  ${r.name}`));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
