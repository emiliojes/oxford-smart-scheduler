import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Teacher definitions
// subjects: list of subject names this teacher teaches
// grades: list of grade display names (e.g. "1A", "KA", "12A")
const teacherDefs: {
  name: string;
  level: string;
  subjects: string[];
  grades: string[];
}[] = [
  { name: "Irlanda Tuñon",       level: "SECONDARY", subjects: ["Maths"],                        grades: ["12A","11A","11B","9A","9B"] },
  { name: "Andrea Concepcion",   level: "SECONDARY", subjects: ["Biology"],                       grades: ["10A","10B","9A","9B","11A","11B","12A"] },
  { name: "Ricardo Ferran",      level: "SECONDARY", subjects: ["Chemistry"],                     grades: ["9A","9B","10A","10B","11A","11B","12A"] },
  { name: "Eduardo Bell",        level: "SECONDARY", subjects: ["Maths"],                         grades: ["8A","8B","10A","10B"] },
  { name: "Aristides Guerra",    level: "SECONDARY", subjects: ["Physics"],                       grades: ["9A","9B","10A","10B","11A","11B","12A"] },
  { name: "Emilio Núñez",        level: "BOTH",      subjects: ["Computing"],                     grades: ["6A","6B","7A","7B","8A","8B","9A","9B","10A","10B","11A","11B","12A"] },
  { name: "Judith Gil",          level: "SECONDARY", subjects: ["Literature"],                    grades: ["9A","9B","10A","10B","11A","11B","12A"] },
  { name: "Conrado de Leon",     level: "SECONDARY", subjects: ["Science"],                       grades: ["7A","7B","8A","8B","9A","9B"] },
  { name: "Elida Barria",        level: "SECONDARY", subjects: ["Spanish"],                       grades: ["11A","11B","8B","9A","9B","12A"] },
  { name: "Vielka Vega",         level: "SECONDARY", subjects: ["English"],                       grades: ["6A","6B","7A","7B"] },
  { name: "Maria Pitti",         level: "SECONDARY", subjects: ["Spanish"],                       grades: ["8A","7A","7B","10A","10B"] },
  { name: "Omely Rujano",        level: "BOTH",      subjects: ["Spanish"],                       grades: ["5A","5B","6A","6B","4B"] },
  { name: "Enis Rodriguez",      level: "SECONDARY", subjects: ["English","Literature"],          grades: ["8A","8B","6A","6B","7A","7B"] },
  { name: "Andrea Guerra",       level: "SECONDARY", subjects: ["English"],                       grades: ["10A","10B","11A","11B","12A"] },
  { name: "Vanessa Muñoz",       level: "SECONDARY", subjects: ["Social Science"],                grades: ["7A","7B","8A","8B","9A","9B","10A","10B","11A","11B","12A"] },
  { name: "Leonel Vega",         level: "SECONDARY", subjects: ["English"],                       grades: ["9A","9B"] },
  { name: "Adolfo Diaz",         level: "PRIMARY",   subjects: ["Music"],                         grades: ["1A","1B","2A","2B","2C","3B","4B","5A","5B"] },
  { name: "Francisco Mendoza",   level: "SECONDARY", subjects: ["Maths"],                         grades: ["6A","6B","7A","7B"] },
  { name: "Deyanira Dominguez",  level: "PRIMARY",   subjects: ["Spanish"],                       grades: ["KA","KB","KC","1A","1B","1C"] },
  { name: "Avidel Gonzalez",     level: "PRIMARY",   subjects: ["Spanish"],                       grades: ["2A","2B","2C","3A","3B"] },
  { name: "Aracellys Dominguez", level: "BOTH",      subjects: ["Spanish","Social Studies"],      grades: ["4A","6A","6B","5A","5B"] },
  { name: "Manuel Abrego",       level: "BOTH",      subjects: ["P.E."],                          grades: ["1B","1C","2A","2C","KA","KB","8A","8B","3A","3B","4A","4B","5A","5B","6A","6B","7A","7B"] },
  { name: "Elsi Diaz",           level: "BOTH",      subjects: ["French"],                        grades: ["5A","5B","6A","6B","7A","7B","8A","8B"] },
  { name: "Madelaine Arrollo",   level: "PRIMARY",   subjects: ["Social Studies"],                grades: ["1A","1B","1C","2A","2B","2C","3A","3B","4A","4B"] },
];

// Grades that need to be created (Kinder)
const missingGrades = [
  { name: "K", section: "A", level: "PRIMARY" },
  { name: "K", section: "B", level: "PRIMARY" },
  { name: "K", section: "C", level: "PRIMARY" },
];

// Helper: parse grade display name like "1A" -> { name: "1", section: "A" }
// or "KA" -> { name: "K", section: "A" }
function parseGrade(display: string): { name: string; section: string } {
  // Handle K grades: KA, KB, KC
  if (display.startsWith("K")) {
    return { name: "K", section: display.slice(1) };
  }
  // Handle numeric grades: 1A, 10B, 12A
  const match = display.match(/^(\d+)([A-Z])$/);
  if (match) return { name: match[1], section: match[2] };
  // Fallback
  return { name: display, section: "" };
}

async function main() {
  console.log("🌱 Seeding teachers...");

  // ─── CREATE MISSING KINDER GRADES ─────────────────────────────────────────
  for (const g of missingGrades) {
    const existing = await prisma.grade.findFirst({ where: { name: g.name, section: g.section } });
    if (!existing) {
      await prisma.grade.create({
        data: { name: g.name, section: g.section, level: g.level, studentCount: 20, subjectCount: 0 },
      });
      console.log(`  ✅ Grade created: ${g.name}${g.section}`);
    }
  }

  // ─── ENSURE "Science" SUBJECT EXISTS FOR SECONDARY ────────────────────────
  let scienceSecondary = await prisma.subject.findFirst({ where: { name: "Science", level: "SECONDARY" } });
  if (!scienceSecondary) {
    scienceSecondary = await prisma.subject.create({
      data: { name: "Science", level: "SECONDARY", weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
    });
    console.log("  ✅ Subject created: Science (SECONDARY)");
  }

  // ─── TEACHERS ─────────────────────────────────────────────────────────────
  for (const def of teacherDefs) {
    // Upsert teacher
    let teacher = await prisma.teacher.findFirst({ where: { name: def.name } });
    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: { name: def.name, level: def.level, maxWeeklyHours: 27 },
      });
      console.log(`  ✅ Teacher created: ${def.name}`);
    } else {
      console.log(`  ⏭  Teacher exists: ${def.name}`);
    }

    // Link subjects
    for (const subName of def.subjects) {
      const subject = await prisma.subject.findFirst({ where: { name: subName } });
      if (!subject) { console.log(`     ⚠ Subject not found: ${subName}`); continue; }
      const exists = await prisma.teacherSubject.findFirst({
        where: { teacherId: teacher.id, subjectId: subject.id },
      });
      if (!exists) {
        await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: subject.id } });
      }
    }

    console.log(`     → Subjects linked for ${def.name}`);
  }

  console.log("\n✅ Teachers seeded successfully!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
