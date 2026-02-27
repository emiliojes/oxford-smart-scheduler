import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || "admin";
  const password = process.argv[3] || "oxford2026";

  const passwordHash = await bcrypt.hash(password, 10);

  const id = Math.random().toString(36).substring(2, 22);

  const user = await prisma.user.create({
    data: {
      id,
      username,
      password: passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin user created: username="${user.username}", role="${user.role}"`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
