import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  // Create Arts subject if missing
  let subject = await prisma.subject.findFirst({ where: { name: "Arts" } });
  if (!subject) {
    subject = await prisma.subject.create({ data: { name: "Arts", level: "BOTH" as any, weeklyFrequency: 5, defaultDuration: "60" } });
    console.log("Created subject: Arts");
  } else console.log("Exists subject: Arts");

  // Create TBD - Arts teacher if missing
  let teacher = await prisma.teacher.findFirst({ where: { name: "TBD - Arts" } });
  if (!teacher) {
    teacher = await prisma.teacher.create({ data: { name: "TBD - Arts", level: "SECONDARY" } as any });
    console.log("Created teacher: TBD - Arts");
  } else console.log("Exists teacher: TBD - Arts");

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
