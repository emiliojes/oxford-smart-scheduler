import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Create teacher "RESOURCE ROOM SUPPORT" if not exists
  let teacher = await prisma.teacher.findFirst({ where: { name: "RESOURCE ROOM SUPPORT" } });
  if (!teacher) {
    teacher = await prisma.teacher.create({
      data: { name: "RESOURCE ROOM SUPPORT", level: "PRIMARY", maxWeeklyHours: 40 } as any,
    });
    console.log("Created teacher:", teacher.name);
  } else {
    console.log("Teacher already exists:", teacher.name);
  }

  // Create subjects for each RRS entry
  const subjects = [
    "MUSIC ADOLFO", "SPANISH ARACELLYS / ENGLISH", "SPANISH ARACELLYS",
    "SCIENCE", "SCIENCE ENGLISH LEO", "ENGLISH LEO",
    "ENGLISH VIELKA", "SCIENCE ENGLISH VIELKA",
    "SPANISH OMELY", "MATHS EDUARDO", "MATHS FRANCISCO",
    "CONRADO SCIENCE SPANISH AVIDEL", "SPANISH AVIDEL",
    "SPANISH ARACELLYS SOC. MADELAINE", "SOC. MADELAINE",
  ];

  for (const name of subjects) {
    const existing = await prisma.subject.findFirst({ where: { name } });
    if (!existing) {
      await prisma.subject.create({ data: { name, level: "PRIMARY", weeklyFrequency: 1, defaultDuration: "SIXTY" } as any });
      console.log("Created subject:", name);
    }
  }

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
