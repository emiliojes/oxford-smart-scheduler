import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEACHER_NAME = process.argv[2] || "Avidel";

async function verifyTeacher() {
  const teachers = await prisma.teacher.findMany({
    where: { name: { contains: TEACHER_NAME, mode: "insensitive" } },
    select: { id: true, name: true }
  });
  
  if (teachers.length === 0) { console.log(`No teacher found with '${TEACHER_NAME}'`); return; }
  
  for (const teacher of teachers) {
    console.log(`\n=== ${teacher.name} ===`);
    
    const assignments = await prisma.assignment.findMany({
      where: { teacherId: teacher.id },
      include: { timeBlock: true, subject: true, grade: true, room: true },
      orderBy: { timeBlock: { dayOfWeek: 'asc' } }
    });
    
    console.log(`Total assignments: ${assignments.length}`);
    
    const dayNames = ["", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
    const byDay = [1,2,3,4,5].map(d => ({
      day: d,
      name: dayNames[d],
      items: assignments.filter(a => a.timeBlock.dayOfWeek === d)
        .sort((a,b) => a.timeBlock.startTime.localeCompare(b.timeBlock.startTime))
    }));
    
    for (const { name, items } of byDay) {
      if (items.length === 0) continue;
      console.log(`\n--- ${name} ---`);
      for (const a of items) {
        const grade = a.grade ? `${a.grade.name}${a.grade.section||''}` : 'no-grade';
        console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} | ${a.subject.name} | ${grade} | ${a.timeBlock.blockType} | dur=${a.timeBlock.duration}`);
      }
    }
    
    // Hours summary
    const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
    const teaching = assignments.filter(a =>
      a.timeBlock.blockType === "CLASS" && !DUTY_KEYWORDS.some(k => a.subject.name.includes(k))
    );
    const unique = Array.from(new Map(teaching.map(a => [`${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`, a])).values());
    const totalMins = unique.reduce((s, a) => s + parseFloat(String(a.timeBlock.duration ?? 0)), 0);
    const h = Math.floor(totalMins / 60), m = totalMins % 60;
    console.log(`\n=> Total clases: ${h}h ${m}min (${unique.length} slots)`);
  }
}

verifyTeacher().catch(console.error).finally(() => prisma.$disconnect());
