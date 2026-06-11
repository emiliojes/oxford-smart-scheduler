import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// 1. Create teacher
let omely = await p.teacher.findFirst({ where: { name: "Omely Rujano" } });
if (!omely) {
  omely = await p.teacher.create({ data: { name: "Omely Rujano", email: "omely.rujano@oxford.edu.pa", level: "SECONDARY" } });
  console.log("Teacher created:", omely.name);
} else {
  console.log("Teacher exists:", omely.name);
}

// 2. Get grade 6A
const grade6A = await p.grade.findFirst({ where: { name: "6", section: "A" } });
if (!grade6A) throw new Error("Grade 6A not found");

// 3. Get subjects
const subjects = await p.subject.findMany();
const sByName = Object.fromEntries(subjects.map(s => [s.name.toLowerCase(), s.id]));
const S = (n) => sByName[n.toLowerCase()] ?? sByName[n.toLowerCase().replace(/\s+/g,"_")];

// 4. Get room
const room7 = await p.room.findFirst({ where: { name: "Room #7 (Planta Baja)" } });

// 5. TimeBlock IDs for Omely's slots (from import script)
const TB = {
  "1_1": "cmm5nddc5000nkx32qkcoosjx", // Mon 07:30
  "1_2": "cmm5nddhv000okx3231uzka2c", // Mon 08:30
  "2_3": "cmm5ndg0u0014kx32grei26h1", // Tue 09:45
  "3_3": "cmm5ndie9001jkx3232gz84ig", // Wed 09:45
  "4_1": "cmm5ndkg5001wkx32x0ofn96v", // Thu 07:30
  "5_3": "cmm5ndnde002dkx32t72putj5", // Fri 09:45
};

// Slots Omely covers in 6A (day, tbKey, subject)
const slots = [
  ["1_1", "Homeroom"],
  ["1_2", "Math"],
  ["2_3", "Math"],
  ["3_3", "Math"],
  ["4_1", "Math"],
  ["5_3", "Math"],
];

let inserted = 0;
for (const [tbKey, subName] of slots) {
  const tbId = TB[tbKey];
  const subjectId = S(subName);
  if (!subjectId) { console.log("Subject not found:", subName); continue; }

  // Check if already exists
  const exists = await p.assignment.findFirst({ where: { gradeId: grade6A.id, timeBlockId: tbId } });
  if (exists) { console.log(`  EXISTS: ${tbKey} ${subName}`); continue; }

  await p.assignment.create({
    data: {
      gradeId: grade6A.id,
      teacherId: omely.id,
      subjectId,
      timeBlockId: tbId,
      roomId: room7?.id ?? null,
      status: "OK",
    },
  });
  console.log(`  ADDED: ${tbKey} ${subName}`);
  inserted++;
}

// Verify 6A total
const total = await p.assignment.count({ where: { gradeId: grade6A.id } });
console.log(`\n6A total assignments: ${total}`);
await p.$disconnect();
