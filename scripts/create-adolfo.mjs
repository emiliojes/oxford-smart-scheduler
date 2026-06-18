import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Create Adolfo Diaz - Music teacher for Primary + Middle School
const adolfo = await p.teacher.create({
  data: {
    name: "Adolfo Diaz",
    email: "adolfo.diaz@oxford.edu.pa",
    level: "BOTH",  // Primary + Middle
    primaryType: null,
    maxWeeklyHours: 23,
  },
});

console.log("✅ Created teacher:", adolfo.name);
console.log("ID:", adolfo.id);

await p.$disconnect();
