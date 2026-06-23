import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const subject = await p.subject.findFirst({ where: { name: "Math 9" } });

if (!subject) {
  console.log("❌ Subject 'Math 9' not found");
} else {
  const count = await p.assignment.count({ where: { subjectId: subject.id } });
  console.log(`📋 Subject: "${subject.name}" (ID: ${subject.id})`);
  console.log(`📋 Assignments using this subject: ${count}`);
  
  await p.subject.update({ where: { id: subject.id }, data: { name: "Math" } });
  console.log(`✅ Renamed "Math 9" → "Math"`);
}

await p.$disconnect();
