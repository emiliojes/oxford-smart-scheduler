import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const teacher = await p.teacher.findFirst({ 
  where: { name: { contains: "Irlanda" } } 
});

if (!teacher) {
  console.log("Teacher Irlanda not found");
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
  console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${note} [${a.id.substring(0, 8)}]`);
}

console.log('\n\n🔍 VERIFICANDO PROBLEMAS REPORTADOS:\n');

// Martes 11:45 con 9B
const martes1145 = assignments.find(a => 
  a.timeBlock.dayOfWeek === 2 && 
  a.timeBlock.startTime === '11:45' &&
  a.grade.name === '9' && 
  a.grade.section === 'B'
);

console.log('1. Martes 11:45 con 9B:');
if (martes1145) {
  console.log(`   ❌ ENCONTRADO: ${martes1145.grade.name}${martes1145.grade.section} - Debe eliminarse`);
  console.log(`   ID: ${martes1145.id}`);
} else {
  console.log('   ✅ No existe (correcto)');
}

// Miércoles 10:45 con 11B
const miercoles1045 = assignments.find(a => 
  a.timeBlock.dayOfWeek === 3 && 
  a.timeBlock.startTime === '10:45' &&
  a.grade.name === '11' && 
  a.grade.section === 'B'
);

console.log('\n2. Miércoles 10:45 con 11B:');
if (miercoles1045) {
  console.log(`   ✅ ENCONTRADO: ${miercoles1045.grade.name}${miercoles1045.grade.section}`);
} else {
  console.log('   ❌ FALTA - Debe agregarse');
}

// Jueves - verificar orden 11B T.S y 11A
const juevesAssignments = assignments.filter(a => a.timeBlock.dayOfWeek === 4);
console.log('\n3. Jueves - orden correcto:');
console.log('   Debe ser: 11B T.S primero, luego 11A');
console.log('   Actual:');
juevesAssignments.forEach(a => {
  const gradeName = `${a.grade.name}${a.grade.section || ""}`;
  const note = a.note ? ` ${a.note}` : "";
  console.log(`   - ${a.timeBlock.startTime}: ${gradeName}${note}`);
});

await p.$disconnect();
