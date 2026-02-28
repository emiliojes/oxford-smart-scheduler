import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // All users that already have a real role (ADMIN/COORDINATOR/TEACHER) should be ACTIVE
  const result = await prisma.user.updateMany({
    where: { role: { in: ["ADMIN", "COORDINATOR", "TEACHER"] } },
    data: { status: "ACTIVE" },
  });
  console.log(`✅ Fixed ${result.count} existing users → status ACTIVE`);

  const users = await prisma.user.findMany({ select: { username: true, role: true, status: true } });
  users.forEach((u) => console.log(`  ${u.username} | ${u.role} | ${u.status}`));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
