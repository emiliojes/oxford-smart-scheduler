import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getLevelForGrade(name: string): string | null {
  const n = name.toLowerCase().trim();

  // Kinder / Pre-K
  if (n === "k" || n.includes("kinder") || n.includes("pre-k") || n.includes("prek") || n.includes("pre k")) {
    return "PRIMARY";
  }

  // Extract numeric grade
  const match = n.match(/(\d+)/);
  if (match) {
    const grade = parseInt(match[1]);
    if (grade >= 1 && grade <= 5)  return "PRIMARY";
    if (grade >= 6 && grade <= 8)  return "LOW_SECONDARY";
    if (grade >= 9 && grade <= 12) return "SECONDARY";
  }

  return null; // unknown, skip
}

async function main() {
  const grades = await prisma.grade.findMany({ select: { id: true, name: true, level: true } });

  console.log("Updating grade levels...\n");
  let updated = 0;
  let skipped = 0;

  for (const grade of grades) {
    const newLevel = getLevelForGrade(grade.name);
    if (!newLevel) {
      console.log(`⚠️  SKIPPED (unknown): ${grade.name}`);
      skipped++;
      continue;
    }
    if (grade.level === newLevel) {
      console.log(`✅ OK (no change): ${grade.name.padEnd(25)} ${newLevel}`);
      continue;
    }
    await prisma.grade.update({ where: { id: grade.id }, data: { level: newLevel } });
    console.log(`🔄 UPDATED: ${grade.name.padEnd(25)} ${grade.level} → ${newLevel}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch(console.error);
