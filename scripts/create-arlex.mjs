import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Create Arlex Alvarado - English teacher for High School (10AB, 11AB, 12A)
const arlex = await p.teacher.create({
  data: {
    name: "Arlex Alvarado",
    email: "arlex.alvarado@oxford.edu.pa",
    level: "SECONDARY",
    primaryType: null,
    maxWeeklyHours: 22,
  },
});

console.log("✅ Created teacher:", arlex.name);
console.log("ID:", arlex.id);

await p.$disconnect();
