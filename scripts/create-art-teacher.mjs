import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check if Art teacher already exists
let teacher = await p.teacher.findFirst({ 
  where: { 
    OR: [
      { name: { contains: "Art Teacher" } },
      { name: { equals: "TBD - Art" } }
    ]
  } 
});

if (teacher) {
  console.log(`✓ Art teacher already exists: ${teacher.name} (${teacher.id})`);
} else {
  // Create placeholder Art teacher
  teacher = await p.teacher.create({
    data: {
      name: "TBD - Art",
      level: "SECONDARY", // Middle School (grades 6-8)
      maxWeeklyHours: 27,
    }
  });
  console.log(`✅ Created placeholder Art teacher: ${teacher.name} (${teacher.id})`);
}

// Link to Art subject
const artSubject = await p.subject.findFirst({ where: { name: "Art" } });
if (artSubject) {
  const existing = await p.teacherSubject.findFirst({
    where: { teacherId: teacher.id, subjectId: artSubject.id }
  });
  
  if (!existing) {
    await p.teacherSubject.create({
      data: { teacherId: teacher.id, subjectId: artSubject.id }
    });
    console.log(`✅ Linked ${teacher.name} to Art subject`);
  } else {
    console.log(`✓ Already linked to Art subject`);
  }
}

await p.$disconnect();
