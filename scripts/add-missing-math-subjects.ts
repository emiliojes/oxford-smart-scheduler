import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // Add missing Math subjects
  const toCreate = [
    { name: "Math 8", level: "SECONDARY" },
    { name: "Math 10", level: "SECONDARY" },
    { name: "Math 12", level: "SECONDARY" },
  ];
  for (const s of toCreate) {
    const existing = await prisma.subject.findFirst({ where: { name: s.name } });
    if (existing) { console.log(`Already exists: ${s.name}`); continue; }
    const created = await prisma.subject.create({ data: { name: s.name, level: s.level as any, weeklyFrequency: 5, defaultDuration: "60" } });
    console.log(`Created: ${created.name}`);
  }
  // Rename "Maths 12" -> "Math 12" if no "Math 12" already exists
  const maths12 = await prisma.subject.findFirst({ where: { name: "Maths 12" } });
  const math12 = await prisma.subject.findFirst({ where: { name: "Math 12" } });
  if (maths12 && !math12) {
    await prisma.subject.update({ where: { id: maths12.id }, data: { name: "Math 12" } });
    console.log(`Renamed "Maths 12" -> "Math 12"`);
  } else if (maths12 && math12) {
    console.log(`Both "Maths 12" and "Math 12" exist — reassigning assignments from Maths 12 to Math 12`);
    await prisma.assignment.updateMany({ where: { subjectId: maths12.id }, data: { subjectId: math12.id } });
    await prisma.subject.delete({ where: { id: maths12.id } });
    console.log(`Deleted "Maths 12"`);
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
