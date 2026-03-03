import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugEmilioHours() {
  console.log("=== DEBUG EMILIO HOURS ===");
  
  // Find Emilio teacher
  const teachers = await prisma.teacher.findMany({
    where: { name: { contains: "emilio", mode: "insensitive" } },
    select: { id: true, name: true }
  });
  console.log("Teachers found:", teachers);
  
  if (teachers.length === 0) {
    console.log("No teacher found with 'emilio'");
    return;
  }
  
  const emilio = teachers[0];
  console.log(`\nUsing: ${emilio.name} (${emilio.id})\n`);
  
  // Get all assignments for Emilio
  const assignments = await prisma.assignment.findMany({
    where: { teacherId: emilio.id },
    include: {
      timeBlock: true,
      subject: true,
      grade: true,
      room: true
    },
    orderBy: { timeBlock: { dayOfWeek: 'asc' } }
  });
  
  console.log(`Total assignments: ${assignments.length}`);
  
  // Filter teaching assignments (CLASS blocks, exclude duties)
  const DUTY_KEYWORDS = ["Duty", "Resource Room Support", "Homeroom"];
  const isDuty = (name: string) => DUTY_KEYWORDS.some(k => name.includes(k));
  const teachingAssignments = assignments.filter(a =>
    a.timeBlock.blockType === "CLASS" && !isDuty(a.subject.name)
  );
  
  console.log(`Teaching assignments (CLASS only): ${teachingAssignments.length}`);
  
  // Group by day
  const byDay = [1,2,3,4,5].map(day => {
    const dayAssignments = teachingAssignments.filter(a => a.timeBlock.dayOfWeek === day);
    const dayNames = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
    return { day, name: dayNames[day-1], assignments: dayAssignments };
  });
  
  // Show details per day
  for (const { day, name, assignments: dayAssigns } of byDay) {
    console.log(`\n--- ${name} (${dayAssigns.length} assignments) ---`);
    
    // Show unique slots
    const slots = new Map<string, typeof dayAssigns[0]>();
    for (const a of dayAssigns) {
      const key = `${a.timeBlock.startTime}`;
      if (!slots.has(key)) slots.set(key, a);
    }
    
    let dayMins = 0;
    for (const [startTime, a] of slots) {
      const dur = parseFloat(String(a.timeBlock.duration ?? 0));
      const durNum = isNaN(dur) ? 0 : dur;
      dayMins += durNum;
      console.log(`  ${startTime} - ${a.timeBlock.endTime} | ${a.subject.name} | ${a.grade?.name}${a.grade?.section||''} | duration=${a.timeBlock.duration} (${durNum}min)`);
    }
    
    const h = Math.floor(dayMins / 60);
    const m = dayMins % 60;
    console.log(`  => Day total: ${h}h ${m}min (${dayMins} minutes)\n`);
  }
  
  // Overall total with deduplication
  const uniqueSlots = Array.from(
    new Map(teachingAssignments.map(a => [`${a.timeBlock.dayOfWeek}-${a.timeBlock.startTime}`, a])).values()
  );
  const totalMins = uniqueSlots.reduce((sum, a) => {
    const dur = parseFloat(String(a.timeBlock.duration ?? 0));
    return sum + (isNaN(dur) ? 0 : dur);
  }, 0);
  const th = Math.floor(totalMins / 60);
  const tm = totalMins % 60;
  console.log(`=== OVERALL TOTAL ===`);
  console.log(`Unique slots: ${uniqueSlots.length}`);
  console.log(`Total minutes: ${totalMins}`);
  console.log(`Total: ${th}h ${tm}min`);
}

debugEmilioHours()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
