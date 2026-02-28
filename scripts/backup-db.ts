import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("📦 Creating database backup...");

  const [teachers, subjects, grades, rooms, timeBlocks, gradeSubjects, teacherSubjects, assignments, users] = await Promise.all([
    prisma.teacher.findMany(),
    prisma.subject.findMany(),
    prisma.grade.findMany(),
    prisma.room.findMany(),
    prisma.timeBlock.findMany(),
    prisma.gradeSubject.findMany(),
    prisma.teacherSubject.findMany(),
    prisma.assignment.findMany(),
    prisma.user.findMany(),
  ]);

  const backup = {
    timestamp: new Date().toISOString(),
    teachers,
    subjects,
    grades,
    rooms,
    timeBlocks,
    gradeSubjects,
    teacherSubjects,
    assignments,
    users: users.map(u => ({ ...u, password: "[REDACTED]" })),
  };

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filepath = path.join(process.cwd(), "scripts", filename);
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

  console.log(`✅ Backup saved to: scripts/${filename}`);
  console.log(`   Teachers: ${teachers.length}`);
  console.log(`   Subjects: ${subjects.length}`);
  console.log(`   Grades: ${grades.length}`);
  console.log(`   Rooms: ${rooms.length}`);
  console.log(`   TimeBlocks: ${timeBlocks.length}`);
  console.log(`   Assignments: ${assignments.length}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
