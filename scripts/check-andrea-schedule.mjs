import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Andrea" }, name: { contains: "Concepcion" } } 
});

if (!teacher) {
  console.log("Teacher Andrea Concepcion not found");
  process.exit(1);
}

console.log(`📅 HORARIO ACTUAL: ${teacher.name}\n`);

const assignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } },
  ],
});

const days = ["", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES"];
let currentDay = 0;

for (const a of assignments) {
  if (a.timeBlock.dayOfWeek !== currentDay) {
    currentDay = a.timeBlock.dayOfWeek;
    console.log(`\n${days[currentDay]}:`);
  }
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` (${a.note})` : "";
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note}`);
}

// Verificar miércoles última hora con 12A
console.log('\n\n🔍 VERIFICANDO MIÉRCOLES ÚLTIMA HORA (14:15-15:15) CON 12A:\n');

const miercolesUltima = assignments.find(a => 
  a.timeBlock.dayOfWeek === 3 && 
  a.timeBlock.startTime === '14:15' &&
  a.grade.name === '12' && 
  a.grade.section === 'A'
);

if (miercolesUltima) {
  console.log('✅ ENCONTRADO: 12A Biology');
} else {
  console.log('❌ FALTA - Debe agregarse 12A Biology a las 14:15-15:15');
}

// Mostrar todas las clases del miércoles
console.log('\n📋 MIÉRCOLES COMPLETO:');
const miercoles = assignments.filter(a => a.timeBlock.dayOfWeek === 3);
miercoles.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
});

await p.$disconnect();
