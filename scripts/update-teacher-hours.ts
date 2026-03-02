import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const updates: { name: string; hours: number }[] = [
  { name: "Irlanda Tuñon",        hours: 26 },
  { name: "Andrea Concepcion",    hours: 25 },
  { name: "Ricardo Ferran",       hours: 26 },
  { name: "Aristides Guerra",     hours: 26 },
  { name: "Emilio Núñez",         hours: 17 },
  { name: "Judith Gil",           hours: 24 },
  { name: "Conrado de Leon",      hours: 24 },
  { name: "Elida Barria",         hours: 25 },
  { name: "Vielka Vega",          hours: 23 },
  { name: "Maria Pitti",          hours: 23 },
  { name: "Omely Rujano",         hours: 24 },
  { name: "Enis Rodriguez",       hours: 25 },
  { name: "Andrea Guerra",        hours: 22 },
  { name: "Vanessa Muñoz",        hours: 26 },
  { name: "Leonel Vega",          hours: 13 },
  { name: "Adolfo Diaz",          hours: 23 },
  { name: "Francisco Mendoza",    hours: 23 },
  { name: "Deyanira Dominguez",   hours: 24 },
  { name: "Avidel Gonzalez",      hours: 24 },
  { name: "Aracellys Dominguez",  hours: 21 },
  { name: "Manuel Abrego",        hours: 21 },
  { name: "Elsi Diaz",            hours: 14 },
  { name: "Madelaine Arrollo",    hours: 23 },
  { name: "Arlyn",                hours: 15 },
];

async function main() {
  console.log("Updating teacher weekly hours...\n");

  let updated = 0;
  let notFound = 0;

  for (const { name, hours } of updates) {
    // Try exact match first, then partial
    let teacher = await prisma.teacher.findFirst({ where: { name } });
    if (!teacher) {
      teacher = await prisma.teacher.findFirst({ where: { name: { contains: name.split(" ")[0] } } });
    }

    if (teacher) {
      await prisma.teacher.update({ where: { id: teacher.id }, data: { maxWeeklyHours: hours } });
      console.log(`✅ ${teacher.name.padEnd(30)} → ${hours}h`);
      updated++;
    } else {
      console.log(`❌ NOT FOUND: ${name}`);
      notFound++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${notFound} not found.`);
  await prisma.$disconnect();
}

main().catch(console.error);
