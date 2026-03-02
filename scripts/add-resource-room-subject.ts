import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const existing = await prisma.subject.findFirst({ where: { name: "Resource Room Support" } });
  if (existing) { console.log("Already exists:", existing.name); }
  else {
    const s = await prisma.subject.create({
      data: { name: "Resource Room Support", level: "SECONDARY", weeklyFrequency: 3, defaultDuration: "60" },
    });
    console.log("Created:", s.name, s.id);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
