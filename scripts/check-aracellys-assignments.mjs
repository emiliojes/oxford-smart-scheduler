import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO ASIGNACIONES DE ARACELLYS DOMINGUEZ\n');

const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Aracellys" } }
});

console.log(`Teacher: ${teacher.name}`);
console.log(`ID: ${teacher.id}`);
console.log(`Level: ${teacher.level}\n`);

const assignments = await p.assignment.findMany({
  where: { teacherId: teacher.id },
  include: {
    subject: true,
    grade: true,
    timeBlock: true,
    room: true
  },
  orderBy: [
    { timeBlock: { dayOfWeek: 'asc' } },
    { timeBlock: { startTime: 'asc' } }
  ]
});

console.log(`📚 Total de asignaciones: ${assignments.length}\n`);

if (assignments.length === 0) {
  console.log('⚠️  NO TIENE CLASES ASIGNADAS\n');
  console.log('💡 Según la imagen que compartiste, Aracellys debería tener:');
  console.log('   - Spanish 4A, 6A, 6B');
  console.log('   - Social Studies');
  console.log('   - Student Arrival Duty');
  console.log('   - Resource Room Support\n');
  console.log('📋 Opciones para agregar sus clases:');
  console.log('   1. Manualmente desde la UI (botón "+ Add New")');
  console.log('   2. Crear un script de importación');
  console.log('   3. Transferir desde otro teacher si existen\n');
} else {
  const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  
  console.log('📅 HORARIO ACTUAL:\n');
  
  let currentDay = 0;
  assignments.forEach(a => {
    if (a.timeBlock.dayOfWeek !== currentDay) {
      currentDay = a.timeBlock.dayOfWeek;
      console.log(`\n${days[currentDay]}:`);
    }
    const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
    console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}${a.room ? ` (${a.room.name})` : ''}`);
  });
  console.log('');
}

await p.$disconnect();
