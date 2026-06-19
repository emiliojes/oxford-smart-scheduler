import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Maths teacher
let teacher = await p.teacher.findFirst({ where: { name: { contains: "Maths 6A,6B,7A,7B" } } });
if (!teacher) {
  console.log("⚠️  Maths teacher not found. Run create-maths-teacher.mjs first");
  process.exit(1);
}

const mathSubject = await p.subject.findFirst({ 
  where: { 
    OR: [
      { name: "Math" },
      { name: "Maths" },
      { name: { contains: "Math" } }
    ]
  } 
});

console.log("Teacher:", teacher?.name);
console.log("Subject:", mathSubject?.name);

// Clear all assignments
await p.assignment.deleteMany({
  where: { teacherId: teacher.id },
});
console.log("🗑️  Cleared\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// Middle School (grades 6-7) use SECONDARY for morning, LOW_SECONDARY for afternoon
const getTB = (day, startTime) => {
  const MORNING_SLOTS = ["07:30", "08:30", "09:45", "10:45", "11:45"];
  const isMorning = MORNING_SLOTS.includes(startTime);
  const levels = isMorning ? ["SECONDARY", "BOTH"] : ["LOW_SECONDARY", "BOTH"];
  
  return p.timeBlock.findFirst({
    where: { dayOfWeek: day, startTime, level: { in: levels }, blockType: "CLASS" },
  });
};

const create = async (day, startTime, gradeName, gradeSection, note = null) => {
  const grade = await g(gradeName, gradeSection);
  if (!grade) { console.warn(`  ⚠️  Grade not found: ${gradeName}${gradeSection ?? ""}`); return; }
  const tb = await getTB(day, startTime);
  if (!tb) { console.warn(`  ⚠️  No TB for ${gradeName}${gradeSection ?? ""} day${day} ${startTime}`); return; }
  const existing = await p.assignment.findFirst({ where: { teacherId: teacher.id, gradeId: grade.id, timeBlockId: tb.id } });
  if (existing) { console.log(`  ✓ Skip: ${gradeName}${gradeSection ?? ""} day${day} ${tb.startTime}`); return; }
  await p.assignment.create({
    data: { teacherId: teacher.id, subjectId: mathSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Math${note ? " (" + note + ")" : ""}`);
};

// MONDAY (day 1)
await create(1, "08:30", "6", "A");
await create(1, "09:45", "7", "B");
await create(1, "10:45", "7", "A");
await create(1, "11:45", "6", "B");

// TUESDAY (day 2)
await create(2, "07:30", "7", "B");
await create(2, "08:30", "7", "A");
await create(2, "09:45", "6", "A");
await create(2, "10:45", "6", "B");

// WEDNESDAY (day 3)
await create(3, "07:30", "7", "B");
await create(3, "09:45", "6", "A");
await create(3, "10:45", "7", "A");
await create(3, "11:45", "6", "B");

// THURSDAY (day 4)
await create(4, "07:30", "6", "A");
await create(4, "10:45", "7", "B");
await create(4, "11:45", "7", "A");
await create(4, "13:15", "6", "B");

// FRIDAY (day 5)
await create(5, "07:30", "6", "B");
await create(5, "08:30", "7", "A");
await create(5, "09:45", "6", "A");
await create(5, "10:45", "7", "B");

console.log("\n✅ Maths teacher schedule complete!");
await p.$disconnect();
