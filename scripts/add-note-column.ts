import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Assignment" ADD COLUMN IF NOT EXISTS "note" TEXT`);
    console.log("✅ Column 'note' added to Assignment");
  } catch (e: any) {
    console.log("Note:", e.message);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
