import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🎓 Creating missing teachers...\n');

const teachersToCreate = [
  {
    name: "Aracellys Dominguez",
    level: "PRIMARY", // Spanish 4A, 6A,B; Social Studies 5A,B; 6A,B
    maxWeeklyHours: 27,
    subjects: ["Spanish", "Social Studies"]
  },
  {
    name: "Elsi Diaz",
    level: "SECONDARY", // French 5-8 grades (Middle School)
    maxWeeklyHours: 27,
    subjects: ["French"]
  },
  {
    name: "Arlyn Vega",
    level: "PRIMARY", // Computing Kinder-5 grade
    maxWeeklyHours: 27,
    subjects: ["Computing"]
  },
  {
    name: "Manuel Abrego",
    level: "PRIMARY", // P.E. Kinder-9 (mostly primary)
    maxWeeklyHours: 27,
    subjects: ["P.E."]
  },
  {
    name: "Madelaine Arroyo",
    level: "PRIMARY", // Social Sciences 1-4 grade
    maxWeeklyHours: 27,
    subjects: ["Social Studies"]
  }
];

for (const teacherData of teachersToCreate) {
  // Check if teacher already exists
  let teacher = await p.teacher.findFirst({
    where: { name: { contains: teacherData.name.split(' ')[0] } }
  });
  
  if (teacher) {
    console.log(`✓ ${teacherData.name} already exists (${teacher.id})`);
    continue;
  }
  
  // Create teacher
  teacher = await p.teacher.create({
    data: {
      name: teacherData.name,
      level: teacherData.level,
      maxWeeklyHours: teacherData.maxWeeklyHours,
    }
  });
  
  console.log(`✅ Created: ${teacher.name} (${teacher.level}) - ${teacher.id}`);
  
  // Link to subjects
  for (const subjectName of teacherData.subjects) {
    const subject = await p.subject.findFirst({
      where: { 
        OR: [
          { name: subjectName },
          { name: { contains: subjectName } }
        ]
      }
    });
    
    if (subject) {
      const existing = await p.teacherSubject.findFirst({
        where: { teacherId: teacher.id, subjectId: subject.id }
      });
      
      if (!existing) {
        await p.teacherSubject.create({
          data: { teacherId: teacher.id, subjectId: subject.id }
        });
        console.log(`  → Linked to ${subject.name}`);
      }
    } else {
      console.log(`  ⚠️  Subject "${subjectName}" not found`);
    }
  }
}

console.log('\n✅ All teachers processed!');
await p.$disconnect();
