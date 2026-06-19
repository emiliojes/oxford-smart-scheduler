import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Find Science Lab Assistant
let teacher = await p.teacher.findFirst({ where: { name: { contains: "Science Lab Assistant" } } });
if (!teacher) {
  console.log("⚠️  Science Lab Assistant not found");
  process.exit(1);
}

const scienceSubject = await p.subject.findFirst({ where: { name: "Science" } });

console.log("Teacher:", teacher?.name);
console.log("Subject:", scienceSubject?.name);
console.log("\nAdding WED-FRI assignments...\n");

const g = (name, section) => p.grade.findFirst({ where: { name, section: section ?? null } });

// High School and Middle School use SECONDARY for morning, LOW_SECONDARY for afternoon
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
    data: { teacherId: teacher.id, subjectId: scienceSubject.id, gradeId: grade.id, roomId: null, timeBlockId: tb.id, status: "CONFIRMED", note },
  });
  console.log(`  ✅ Day${day} ${tb.startTime} Grade ${gradeName}${gradeSection ?? ""} Science${note ? " (" + note + ")" : ""}`);
};

// WEDNESDAY (day 3)
await create(3, "07:30", "7", "A");
await create(3, "08:30", "11", "A", "BIO 11A");
await create(3, "09:45", "7", "A", "A7");
await create(3, "10:45", "10", "B", "BIO 10 B");
await create(3, "13:15", "6", "B");
await create(3, "14:15", "6", "A");

// THURSDAY (day 4)
await create(4, "08:30", "12", "A", "CHEM 12");
await create(4, "09:45", "6", "B");
await create(4, "10:45", "12", "A", "BIOL 12 A");
await create(4, "11:45", "7", "A", "A7");
await create(4, "13:15", "6", "A");
await create(4, "14:15", "7", "A");

// FRIDAY (day 5)
await create(5, "07:30", "6", "A");
await create(5, "08:30", "7", "A", "A7");
await create(5, "09:45", "11", "A", "CHEM 11 A");
await create(5, "10:45", "6", "B");
await create(5, "11:45", "7", "A");

console.log("\n✅ Science Lab Assistant Part 2 done (WED-FRI)!");
await p.$disconnect();
