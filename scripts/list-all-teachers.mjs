import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('👥 ALL TEACHERS IN DATABASE\n');

const teachers = await p.teacher.findMany({
  include: {
    subjects: {
      include: {
        subject: true
      }
    }
  },
  orderBy: {
    name: 'asc'
  }
});

console.log(`Total teachers: ${teachers.length}\n`);
console.log('='.repeat(80));

teachers.forEach((teacher, index) => {
  const subjects = teacher.subjects.map(ts => ts.subject.name).join(', ');
  console.log(`${index + 1}. ${teacher.name}`);
  console.log(`   Level: ${teacher.level} | Hours: ${teacher.maxWeeklyHours} | Subjects: ${subjects || 'None'}`);
  console.log(`   ID: ${teacher.id}`);
  console.log('');
});

console.log('='.repeat(80));

// Count by level
const byLevel = {
  PRIMARY: teachers.filter(t => t.level === 'PRIMARY').length,
  SECONDARY: teachers.filter(t => t.level === 'SECONDARY').length,
  BOTH: teachers.filter(t => t.level === 'BOTH').length,
};

console.log('\nTeachers by level:');
console.log(`  PRIMARY: ${byLevel.PRIMARY}`);
console.log(`  SECONDARY: ${byLevel.SECONDARY}`);
console.log(`  BOTH: ${byLevel.BOTH}`);

await p.$disconnect();
