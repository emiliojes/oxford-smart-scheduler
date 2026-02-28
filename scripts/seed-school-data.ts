import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Subject definitions: name, level, weeklyFrequency, defaultDuration
const subjectDefs: { name: string; level: string; weeklyFrequency: number; defaultDuration: string; requiresSpecialRoom?: boolean; specialRoomType?: string }[] = [
  // Primary
  { name: "Math",           level: "PRIMARY",   weeklyFrequency: 5, defaultDuration: "FORTYFIVE" },
  { name: "Spanish",        level: "PRIMARY",   weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
  { name: "English",        level: "PRIMARY",   weeklyFrequency: 5, defaultDuration: "FORTYFIVE" },
  { name: "Science",        level: "PRIMARY",   weeklyFrequency: 3, defaultDuration: "FORTYFIVE" },
  { name: "Computing",      level: "BOTH",      weeklyFrequency: 2, defaultDuration: "FORTYFIVE", requiresSpecialRoom: true, specialRoomType: "Computing" },
  { name: "Music",          level: "PRIMARY",   weeklyFrequency: 2, defaultDuration: "FORTYFIVE" },
  { name: "P.E.",           level: "BOTH",      weeklyFrequency: 2, defaultDuration: "SIXTY",     requiresSpecialRoom: true, specialRoomType: "Gym" },
  { name: "PSHE",           level: "PRIMARY",   weeklyFrequency: 1, defaultDuration: "FORTYFIVE" },
  { name: "Social Studies", level: "PRIMARY",   weeklyFrequency: 3, defaultDuration: "FORTYFIVE" },
  { name: "Guided Reading", level: "PRIMARY",   weeklyFrequency: 3, defaultDuration: "THIRTY" },
  { name: "French",         level: "BOTH",      weeklyFrequency: 2, defaultDuration: "FORTYFIVE" },
  // Low Secondary (additions)
  { name: "Social Science", level: "SECONDARY", weeklyFrequency: 3, defaultDuration: "FORTYFIVE" },
  // High Secondary (additions)
  { name: "Biology",        level: "SECONDARY", weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
  { name: "Chemistry",      level: "SECONDARY", weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
  { name: "Physics",        level: "SECONDARY", weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
  { name: "Literature",     level: "SECONDARY", weeklyFrequency: 3, defaultDuration: "FORTYFIVE" },
  { name: "Maths",          level: "SECONDARY", weeklyFrequency: 5, defaultDuration: "FORTYFIVE" },
];

// Grade definitions: number, section, level, subjects
const gradeDefs: { num: string; section: string; level: string; subjects: string[] }[] = [
  // Primary
  ...["1","2","3"].flatMap(n => ["A","B","C"].map(s => ({ num: n, section: s, level: "PRIMARY", subjects: ["Math","Spanish","English","Science","Computing","Music","P.E.","PSHE","Social Studies","Guided Reading","French"] }))),
  ...["4","5"].flatMap(n => ["A","B"].map(s => ({ num: n, section: s, level: "PRIMARY", subjects: ["Math","Spanish","English","Science","Computing","Music","P.E.","PSHE","Social Studies","Guided Reading","French"] }))),
  // Low Secondary
  ...["6","7","8"].flatMap(n => ["A","B"].map(s => ({ num: n, section: s, level: "SECONDARY", subjects: ["Math","Spanish","English","Science","Social Science","Computing","French","P.E."] }))),
  // High Secondary
  ...["9","10","11"].flatMap(n => ["A","B"].map(s => ({ num: n, section: s, level: "SECONDARY", subjects: ["Biology","Chemistry","Maths","Physics","Literature","English","Computing","Spanish","Social Science"] }))),
  { num: "12", section: "A", level: "SECONDARY", subjects: ["Biology","Chemistry","Maths","Physics","Literature","English","Computing","Spanish","Social Science"] },
];

async function main() {
  console.log("🌱 Seeding Oxford School data...");

  // ─── SUBJECTS ─────────────────────────────────────────────────────────────
  const subjects: Record<string, any> = {};
  for (const def of subjectDefs) {
    const existing = await prisma.subject.findFirst({ where: { name: def.name, level: def.level } });
    if (existing) {
      subjects[def.name] = existing;
      console.log(`  ⏭  Subject exists: ${def.name}`);
    } else {
      subjects[def.name] = await prisma.subject.create({
        data: {
          name: def.name,
          level: def.level,
          weeklyFrequency: def.weeklyFrequency,
          defaultDuration: def.defaultDuration,
          requiresSpecialRoom: def.requiresSpecialRoom ?? false,
          specialRoomType: def.specialRoomType ?? null,
        },
      });
      console.log(`  ✅ Subject created: ${def.name} (${def.level})`);
    }
  }

  // ─── GRADES ───────────────────────────────────────────────────────────────
  for (const g of gradeDefs) {
    const gradeName = `${g.num}${g.section}`;
    let grade = await prisma.grade.findFirst({ where: { name: g.num, section: g.section } });
    if (!grade) {
      grade = await prisma.grade.create({
        data: {
          name: g.num,
          section: g.section,
          level: g.level,
          studentCount: 25,
          subjectCount: g.subjects.length,
        },
      });
      console.log(`  ✅ Grade created: ${gradeName}`);
    } else {
      console.log(`  ⏭  Grade exists: ${gradeName}`);
    }

    for (const subName of g.subjects) {
      const subject = subjects[subName];
      if (!subject) { console.log(`     ⚠ Subject not found: ${subName}`); continue; }
      const existing = await prisma.gradeSubject.findFirst({
        where: { gradeId: grade.id, subjectId: subject.id },
      });
      if (!existing) {
        await prisma.gradeSubject.create({ data: { gradeId: grade.id, subjectId: subject.id } });
      }
    }
    console.log(`     → Subjects linked for ${gradeName}`);
  }

  console.log("\n✅ Done! Oxford School data seeded successfully.");
  console.log("📝 Remember to add teachers from the /teachers page.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
