import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check if Science Lab Assistant already exists
let teacher = await p.teacher.findFirst({ 
  where: { 
    OR: [
      { name: { contains: "Science Lab Assistant" } },
      { name: { contains: "Lab Assistant" } }
    ]
  } 
});

if (teacher) {
  console.log(`✓ Science Lab Assistant already exists: ${teacher.name} (${teacher.id})`);
} else {
  // Create placeholder Science Lab Assistant
  teacher = await p.teacher.create({
    data: {
      name: "TBD - Science Lab Assistant",
      level: "SECONDARY",
      maxWeeklyHours: 27,
    }
  });
  console.log(`✅ Created placeholder: ${teacher.name} (${teacher.id})`);
}

// Link to Science subject
const scienceSubject = await p.subject.findFirst({ where: { name: "Science" } });
if (scienceSubject) {
  const existing = await p.teacherSubject.findFirst({
    where: { teacherId: teacher.id, subjectId: scienceSubject.id }
  });
  
  if (!existing) {
    await p.teacherSubject.create({
      data: { teacherId: teacher.id, subjectId: scienceSubject.id }
    });
    console.log(`✅ Linked ${teacher.name} to Science subject`);
  } else {
    console.log(`✓ Already linked to Science subject`);
  }
}

await p.$disconnect();
