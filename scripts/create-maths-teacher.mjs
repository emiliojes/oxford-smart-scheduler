import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Check if Maths teacher already exists
let teacher = await p.teacher.findFirst({ 
  where: { 
    OR: [
      { name: { contains: "Maths Teacher" } },
      { name: { contains: "TBD - Maths" } }
    ]
  } 
});

if (teacher) {
  console.log(`✓ Maths teacher already exists: ${teacher.name} (${teacher.id})`);
} else {
  // Create placeholder Maths teacher
  teacher = await p.teacher.create({
    data: {
      name: "TBD - Maths 6A,6B,7A,7B",
      level: "SECONDARY", // Middle School (grades 6-7)
      maxWeeklyHours: 27,
    }
  });
  console.log(`✅ Created placeholder: ${teacher.name} (${teacher.id})`);
}

// Link to Math subject (check both "Math" and "Maths")
let mathSubject = await p.subject.findFirst({ 
  where: { 
    OR: [
      { name: "Math" },
      { name: "Maths" },
      { name: { contains: "Math" } }
    ]
  } 
});

if (!mathSubject) {
  console.log("⚠️  Math subject not found");
} else {
  const existing = await p.teacherSubject.findFirst({
    where: { teacherId: teacher.id, subjectId: mathSubject.id }
  });
  
  if (!existing) {
    await p.teacherSubject.create({
      data: { teacherId: teacher.id, subjectId: mathSubject.id }
    });
    console.log(`✅ Linked ${teacher.name} to ${mathSubject.name} subject`);
  } else {
    console.log(`✓ Already linked to ${mathSubject.name} subject`);
  }
}

await p.$disconnect();
