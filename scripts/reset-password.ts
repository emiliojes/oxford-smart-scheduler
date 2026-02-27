import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPassword() {
  const username = process.argv[2];
  const newPassword = process.argv[3];

  if (!username || !newPassword) {
    console.error("Usage: npx ts-node scripts/reset-password.ts <username> <newpassword>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.error(`User "${username}" not found`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { username },
    data: { password: passwordHash },
  });

  console.log(`✅ Password for "${username}" has been reset successfully.`);
  await prisma.$disconnect();
}

resetPassword().catch((e) => {
  console.error(e);
  process.exit(1);
});
