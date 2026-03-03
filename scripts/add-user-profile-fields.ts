import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS name TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light'`);
  console.log("Added name and theme columns to User table");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
