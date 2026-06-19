import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check if Avidel already exists
let teacher = await p.teacher.findFirst({ 
  where: { 
    name: { contains: "Avidel" }
  } 
});

if (teacher) {
  console.log(`✓ Teacher already exists: ${teacher.name} (${teacher.id})`);
} else {
  // Create Avidel Gonzalez
  teacher = await p.teacher.create({
    data: {
      name: "Avidel Gonzalez",
      level: "PRIMARY", // Grades 2-3
      maxWeeklyHours: 27,
    }
  });
  console.log(`✅ Created teacher: ${teacher.name} (${teacher.id})`);
}

// Link to Spanish subject
const spanishSubject = await p.subject.findFirst({ where: { name: "Spanish" } });
if (spanishSubject) {
  const existing = await p.teacherSubject.findFirst({
    where: { teacherId: teacher.id, subjectId: spanishSubject.id }
  });
  
  if (!existing) {
    await p.teacherSubject.create({
      data: { teacherId: teacher.id, subjectId: spanishSubject.id }
    });
    console.log(`✅ Linked ${teacher.name} to Spanish subject`);
  } else {
    console.log(`✓ Already linked to Spanish subject`);
  }
}

await p.$disconnect();
