import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log("Checking for KA time block on day 2 at 09:15...\n");

const tb = await p.timeBlock.findFirst({
  where: { 
    dayOfWeek: 2, 
    startTime: "09:15", 
    level: "SECONDARY", 
    blockType: "CLASS" 
  }
});

if (tb) {
  console.log("✅ Time block found:");
  console.log(`   ID: ${tb.id}`);
  console.log(`   Day: ${tb.dayOfWeek}`);
  console.log(`   Time: ${tb.startTime} - ${tb.endTime}`);
  console.log(`   Level: ${tb.level}`);
  console.log(`   Type: ${tb.blockType}\n`);
} else {
  console.log("❌ Time block NOT found\n");
}

const ka = await p.grade.findFirst({ where: { name: "K", section: "A" } });
if (ka) {
  console.log(`✅ Grade KA found: ${ka.id}`);
} else {
  console.log("❌ Grade KA NOT found");
}

const teacher = await p.teacher.findFirst({ where: { name: { contains: "Adolfo" } } });
if (teacher && ka && tb) {
  const assignment = await p.assignment.findFirst({
    where: {
      teacherId: teacher.id,
      gradeId: ka.id,
      timeBlockId: tb.id
    },
    include: { subject: true }
  });
  
  if (assignment) {
    console.log(`✅ Assignment found: ${assignment.subject.name} to KA on day 2 at 09:15`);
  } else {
    console.log("❌ Assignment NOT found for Adolfo -> KA on day 2 at 09:15");
  }
}

await p.$disconnect();
