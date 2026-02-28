import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  // Find latest backup file
  const scriptsDir = path.join(process.cwd(), "scripts");
  const backupFiles = fs.readdirSync(scriptsDir).filter(f => f.startsWith("backup-") && f.endsWith(".json")).sort().reverse();
  if (backupFiles.length === 0) { console.error("No backup file found!"); process.exit(1); }
  const backupFile = backupFiles[0];
  console.log(`📂 Restoring from: ${backupFile}`);

  const backup = JSON.parse(fs.readFileSync(path.join(scriptsDir, backupFile), "utf-8"));

  // Restore in order (respecting foreign keys)
  console.log("🔄 Restoring subjects...");
  for (const s of backup.subjects) {
    await prisma.subject.upsert({ where: { id: s.id }, update: s, create: s });
  }

  console.log("🔄 Restoring grades...");
  for (const g of backup.grades) {
    await prisma.grade.upsert({ where: { id: g.id }, update: g, create: g });
  }

  console.log("🔄 Restoring teachers...");
  for (const t of backup.teachers) {
    await prisma.teacher.upsert({ where: { id: t.id }, update: t, create: t });
  }

  console.log("🔄 Restoring rooms...");
  for (const r of backup.rooms) {
    await prisma.room.upsert({ where: { id: r.id }, update: r, create: r });
  }

  console.log("🔄 Restoring time blocks (adding endTime)...");
  // Old time blocks don't have endTime — derive it from startTime + duration
  const durationMinutes: Record<string, number> = { THIRTY: 30, FORTYFIVE: 45, SIXTY: 60 };
  function addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(":").map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  for (const tb of backup.timeBlocks) {
    const endTime = tb.endTime ?? addMinutes(tb.startTime, durationMinutes[tb.duration] ?? 60);
    const data = { ...tb, endTime };
    await prisma.timeBlock.upsert({ where: { id: tb.id }, update: data, create: data });
  }

  console.log("🔄 Restoring grade-subjects links...");
  for (const gs of backup.gradeSubjects) {
    await prisma.gradeSubject.upsert({ where: { id: gs.id }, update: gs, create: gs });
  }

  console.log("🔄 Restoring teacher-subjects links...");
  for (const ts of backup.teacherSubjects) {
    await prisma.teacherSubject.upsert({ where: { id: ts.id }, update: ts, create: ts });
  }

  console.log("🔄 Restoring assignments...");
  for (const a of backup.assignments) {
    await prisma.assignment.upsert({ where: { id: a.id }, update: a, create: a });
  }

  console.log("\n✅ Restore complete!");
  console.log(`   Subjects: ${backup.subjects.length}`);
  console.log(`   Grades: ${backup.grades.length}`);
  console.log(`   Teachers: ${backup.teachers.length}`);
  console.log(`   Rooms: ${backup.rooms.length}`);
  console.log(`   TimeBlocks: ${backup.timeBlocks.length}`);
  console.log(`   Assignments: ${backup.assignments.length}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
