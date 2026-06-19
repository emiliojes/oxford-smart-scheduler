import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log("Looking for Art teachers...\n");

const teachers = await p.teacher.findMany({
  where: {
    OR: [
      { name: { contains: "Art", mode: "insensitive" } },
      { subjects: { some: { subject: { name: "Art" } } } }
    ]
  },
  include: {
    subjects: {
      include: { subject: true }
    }
  }
});

if (teachers.length === 0) {
  console.log("❌ No Art teachers found.");
  console.log("\nAll teachers:");
  const allTeachers = await p.teacher.findMany({ orderBy: { name: "asc" } });
  allTeachers.forEach(t => console.log(`  - ${t.name} (${t.level})`));
} else {
  console.log("✅ Found Art teachers:");
  teachers.forEach(t => {
    console.log(`  - ${t.name} (${t.level})`);
    t.subjects.forEach(s => console.log(`    Subject: ${s.subject.name}`));
  });
}

await p.$disconnect();
