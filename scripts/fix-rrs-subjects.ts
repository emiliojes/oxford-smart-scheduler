import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Delete old subjects with double spaces and recreate with normalized names
  const toFix = [
    { old: "SCIENCE  ENGLISH LEO", fixed: "SCIENCE ENGLISH LEO" },
    { old: "SCIENCE  ENGLISH VIELKA", fixed: "SCIENCE ENGLISH VIELKA" },
    { old: "CONRADO  SCIENCE SPANISH AVIDEL", fixed: "CONRADO SCIENCE SPANISH AVIDEL" },
    { old: "CONRADO SCIENCE     SPANISH AVIDEL", fixed: "CONRADO SCIENCE SPANISH AVIDEL" },
    { old: "SPANISH ARACELLYS   SOC. MADELAINE", fixed: "SPANISH ARACELLYS SOC. MADELAINE" },
    { old: "SPANISH ARACELLYS       SOC. MADELAINE", fixed: "SPANISH ARACELLYS SOC. MADELAINE" },
  ];

  for (const { old, fixed } of toFix) {
    const existing = await prisma.subject.findFirst({ where: { name: old } });
    if (existing) {
      // Check if fixed already exists
      const fixedExists = await prisma.subject.findFirst({ where: { name: fixed } });
      if (fixedExists) {
        // Move assignments to fixed subject then delete old
        await prisma.assignment.updateMany({ where: { subjectId: existing.id }, data: { subjectId: fixedExists.id } });
        await prisma.subject.delete({ where: { id: existing.id } });
        console.log(`Merged "${old}" -> "${fixed}"`);
      } else {
        await prisma.subject.update({ where: { id: existing.id }, data: { name: fixed } });
        console.log(`Renamed "${old}" -> "${fixed}"`);
      }
    } else {
      console.log(`Not found: "${old}" (may already be fixed)`);
    }
  }

  // Ensure SOC. MADELAINE exists
  const socMad = await prisma.subject.findFirst({ where: { name: "SOC. MADELAINE" } });
  if (!socMad) {
    await prisma.subject.create({ data: { name: "SOC. MADELAINE", level: "PRIMARY", weeklyFrequency: 1, defaultDuration: "SIXTY" } as any });
    console.log("Created: SOC. MADELAINE");
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
