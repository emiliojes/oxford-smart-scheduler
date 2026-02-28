import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Fixing teacher/subject linking issues...");

  // ─── 1. ADD ARLYN VEGA ───────────────────────────────────────────────────
  let arlyn = await prisma.teacher.findFirst({ where: { name: "Arlyn Vega" } });
  if (!arlyn) {
    arlyn = await prisma.teacher.create({
      data: { name: "Arlyn Vega", level: "PRIMARY", maxWeeklyHours: 27 },
    });
    console.log("  ✅ Teacher created: Arlyn Vega");
  } else {
    console.log("  ⏭  Teacher exists: Arlyn Vega");
  }

  // Link Computing to Arlyn Vega
  const computing = await prisma.subject.findFirst({ where: { name: "Computing" } });
  if (computing) {
    const exists = await prisma.teacherSubject.findFirst({
      where: { teacherId: arlyn.id, subjectId: computing.id },
    });
    if (!exists) {
      await prisma.teacherSubject.create({ data: { teacherId: arlyn.id, subjectId: computing.id } });
      console.log("  ✅ Linked: Arlyn Vega → Computing");
    }
  }

  // ─── 2. FIX "Sciences" FOR CONRADO DE LEON ──────────────────────────────
  // Conrado teaches Science (Secondary) to 7A, 7B, 8A, 8B, 9A, 9B
  // "Science" already exists as PRIMARY level — we need SECONDARY too
  let scienceSecondary = await prisma.subject.findFirst({ where: { name: "Science", level: "SECONDARY" } });
  if (!scienceSecondary) {
    scienceSecondary = await prisma.subject.create({
      data: { name: "Science", level: "SECONDARY", weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
    });
    console.log("  ✅ Subject created: Science (SECONDARY)");
  }

  const conrado = await prisma.teacher.findFirst({ where: { name: "Conrado de Leon" } });
  if (conrado && scienceSecondary) {
    const exists = await prisma.teacherSubject.findFirst({
      where: { teacherId: conrado.id, subjectId: scienceSecondary.id },
    });
    if (!exists) {
      await prisma.teacherSubject.create({ data: { teacherId: conrado.id, subjectId: scienceSecondary.id } });
      console.log("  ✅ Linked: Conrado de Leon → Science (SECONDARY)");
    }
    // Link grades 7A, 7B, 8A, 8B, 9A, 9B to Science (SECONDARY)
    const gradeNames = [{ name: "7", section: "A" }, { name: "7", section: "B" }, { name: "8", section: "A" }, { name: "8", section: "B" }, { name: "9", section: "A" }, { name: "9", section: "B" }];
    for (const g of gradeNames) {
      const grade = await prisma.grade.findFirst({ where: { name: g.name, section: g.section } });
      if (!grade) continue;
      const exists = await prisma.gradeSubject.findFirst({ where: { gradeId: grade.id, subjectId: scienceSecondary.id } });
      if (!exists) {
        await prisma.gradeSubject.create({ data: { gradeId: grade.id, subjectId: scienceSecondary.id } });
        console.log(`     → Linked Science (SECONDARY) to grade ${g.name}${g.section}`);
      }
    }
  }

  // ─── 3. FIX MATH vs MATHS FOR GRADES 6-8 ────────────────────────────────
  // Eduardo Bell teaches "Maths" (Secondary) to 8A, 8B, 10A, 10B
  // Francisco Mendoza teaches "Maths" (Secondary) to 6A, 6B, 7A, 7B
  // Grades 6-8 currently have "Math" (PRIMARY) linked — need "Maths" (SECONDARY) too
  const mathsSecondary = await prisma.subject.findFirst({ where: { name: "Maths", level: "SECONDARY" } });
  if (mathsSecondary) {
    const lowSecGrades = [
      { name: "6", section: "A" }, { name: "6", section: "B" },
      { name: "7", section: "A" }, { name: "7", section: "B" },
      { name: "8", section: "A" }, { name: "8", section: "B" },
    ];
    for (const g of lowSecGrades) {
      const grade = await prisma.grade.findFirst({ where: { name: g.name, section: g.section } });
      if (!grade) continue;
      const exists = await prisma.gradeSubject.findFirst({ where: { gradeId: grade.id, subjectId: mathsSecondary.id } });
      if (!exists) {
        await prisma.gradeSubject.create({ data: { gradeId: grade.id, subjectId: mathsSecondary.id } });
        console.log(`     → Linked Maths (SECONDARY) to grade ${g.name}${g.section}`);
      }
    }
    console.log("  ✅ Maths (SECONDARY) linked to grades 6-8");
  }

  // ─── 4. ENSURE ENGLISH EXISTS FOR SECONDARY (for 6A-8B via Vielka/Enis) ─
  let englishSecondary = await prisma.subject.findFirst({ where: { name: "English", level: "SECONDARY" } });
  if (!englishSecondary) {
    englishSecondary = await prisma.subject.create({
      data: { name: "English", level: "SECONDARY", weeklyFrequency: 5, defaultDuration: "FORTYFIVE" },
    });
    console.log("  ✅ Subject created: English (SECONDARY)");
  }

  // Link Vielka Vega and Enis Rodriguez to English (SECONDARY)
  for (const teacherName of ["Vielka Vega", "Enis Rodriguez", "Andrea Guerra", "Leonel Vega"]) {
    const teacher = await prisma.teacher.findFirst({ where: { name: teacherName } });
    if (!teacher || !englishSecondary) continue;
    const exists = await prisma.teacherSubject.findFirst({ where: { teacherId: teacher.id, subjectId: englishSecondary.id } });
    if (!exists) {
      await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: englishSecondary.id } });
      console.log(`     → Linked English (SECONDARY) to ${teacherName}`);
    }
  }

  // Link grades 6-8 to English (SECONDARY)
  const lowSecGradesEng = [
    { name: "6", section: "A" }, { name: "6", section: "B" },
    { name: "7", section: "A" }, { name: "7", section: "B" },
    { name: "8", section: "A" }, { name: "8", section: "B" },
  ];
  for (const g of lowSecGradesEng) {
    const grade = await prisma.grade.findFirst({ where: { name: g.name, section: g.section } });
    if (!grade || !englishSecondary) continue;
    const exists = await prisma.gradeSubject.findFirst({ where: { gradeId: grade.id, subjectId: englishSecondary.id } });
    if (!exists) {
      await prisma.gradeSubject.create({ data: { gradeId: grade.id, subjectId: englishSecondary.id } });
    }
  }
  console.log("  ✅ English (SECONDARY) linked to grades 6-8");

  // ─── 5. ENSURE SPANISH EXISTS FOR SECONDARY ──────────────────────────────
  let spanishSecondary = await prisma.subject.findFirst({ where: { name: "Spanish", level: "SECONDARY" } });
  if (!spanishSecondary) {
    spanishSecondary = await prisma.subject.create({
      data: { name: "Spanish", level: "SECONDARY", weeklyFrequency: 4, defaultDuration: "FORTYFIVE" },
    });
    console.log("  ✅ Subject created: Spanish (SECONDARY)");
  }

  for (const teacherName of ["Elida Barria", "Maria Pitti", "Omely Rujano"]) {
    const teacher = await prisma.teacher.findFirst({ where: { name: teacherName } });
    if (!teacher || !spanishSecondary) continue;
    const exists = await prisma.teacherSubject.findFirst({ where: { teacherId: teacher.id, subjectId: spanishSecondary.id } });
    if (!exists) {
      await prisma.teacherSubject.create({ data: { teacherId: teacher.id, subjectId: spanishSecondary.id } });
      console.log(`     → Linked Spanish (SECONDARY) to ${teacherName}`);
    }
  }

  console.log("\n✅ All fixes applied!");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
