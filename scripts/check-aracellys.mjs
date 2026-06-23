import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🔍 VERIFICANDO ARACELLYS DOMINGUEZ\n');

const teacher = await p.teacher.findFirst({
  where: { 
    OR: [
      { name: { contains: "Aracellys" } },
      { name: { contains: "Dominguez" } }
    ]
  }
});

if (!teacher) {
  console.log('❌ Teacher Aracellys no encontrado en la base de datos');
  console.log('\n📋 Necesitas:');
  console.log('   1. Crear el teacher "Aracellys Dominguez"');
  console.log('   2. Asignar sus clases desde la UI o con un script\n');
  await p.$disconnect();
  process.exit(0);
}

console.log(`✅ Teacher encontrado:`);
console.log(`   Nombre: ${teacher.name}`);
console.log(`   ID: ${teacher.id}`);
console.log(`   Level: ${teacher.level}`);
console.log(`   Max Hours: ${teacher.maxWeeklyHours}\n`);

// Buscar asignaciones
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

console.log(`📚 Asignaciones: ${assignments.length}\n`);

if (assignments.length === 0) {
  console.log('⚠️  No tiene clases asignadas en el sistema');
  console.log('\n💡 Opciones:');
  console.log('   1. Agregar clases manualmente desde la UI');
  console.log('   2. Importar desde Excel');
  console.log('   3. Transferir clases de otro teacher\n');
} else {
  const days = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  
  let currentDay = 0;
  assignments.forEach(a => {
    if (a.timeBlock.dayOfWeek !== currentDay) {
      currentDay = a.timeBlock.dayOfWeek;
      console.log(`\n${days[currentDay]}:`);
    }
    const gradeName = a.grade ? `${a.grade.name}${a.grade.section || ''}` : 'N/A';
    console.log(`  ${a.timeBlock.startTime}-${a.timeBlock.endTime} - ${gradeName} ${a.subject.name}`);
  });
  console.log('');
}

await p.$disconnect();
