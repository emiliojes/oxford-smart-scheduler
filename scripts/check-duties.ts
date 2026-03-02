import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.assignment.findMany({
    where: { subject: { name: { in: ["Lunch Duty", "Dismissal Duty", "Homeroom"] } } },
    include: { subject: true, teacher: true, timeBlock: true },
  });
  console.log(`Found ${r.length} duty assignments`);
  r.slice(0, 10).forEach(x => 
    console.log(`  ${x.teacher.name} | ${x.subject.name} | day=${x.timeBlock.dayOfWeek} ${x.timeBlock.startTime}`)
  );
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
