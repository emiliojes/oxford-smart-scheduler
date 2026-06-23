import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('📚 AGREGANDO HORARIO DE ARACELLYS DOMINGUEZ\n');

// Obtener teacher
const teacher = await p.teacher.findFirst({
  where: { name: { contains: "Aracellys" } }
});

if (!teacher) {
  console.log('❌ Teacher no encontrado');
  await p.$disconnect();
  process.exit(1);
}

console.log(`Teacher: ${teacher.name} (${teacher.id})\n`);

// Obtener subjects
const spanish = await p.subject.findFirst({ where: { name: "Spanish" } });
const socialStudies = await p.subject.findFirst({ where: { name: "Social Studies" } });
const arrivalDuty = await p.subject.findFirst({ where: { name: "Arrival Duty" } });
const resourceRoom = await p.subject.findFirst({ where: { name: "Resource Room Support" } });

// Obtener grades
const grade4A = await p.grade.findFirst({ where: { name: '4', section: 'A' } });
const grade5A = await p.grade.findFirst({ where: { name: '5', section: 'A' } });
const grade6A = await p.grade.findFirst({ where: { name: '6', section: 'A' } });
const grade6B = await p.grade.findFirst({ where: { name: '6', section: 'B' } });

console.log('📋 Creando asignaciones basadas en la imagen:\n');

// Estructura: [día, hora inicio, hora fin, grade, subject, descripción]
const schedule = [
  // LUNES
  [1, '07:15', '07:30', null, arrivalDuty, 'Student Arrival Duty - Parking Lot'],
  [1, '08:30', '09:30', grade6B, socialStudies, '6B SOC'],
  [1, '10:45', '11:45', grade6A, socialStudies, '6A SOC'],
  [1, '12:30', '13:15', grade4A, spanish, '4A Spanish'],
  
  // MARTES
  [2, '07:15', '07:30', null, arrivalDuty, 'Student Arrival Duty - Parking Lot'],
  [2, '07:30', '08:30', grade6B, socialStudies, '6B SOC'],
  [2, '08:30', '09:30', null, resourceRoom, 'Resource Room Support'],
  [2, '10:15', '11:15', grade5A, socialStudies, '5A SOC'],
  [2, '11:15', '12:00', grade4A, spanish, '4A Spanish'],
  [2, '14:15', '15:15', grade6A, socialStudies, '6A SOC'],
  
  // MIÉRCOLES
  [3, '07:15', '07:30', null, arrivalDuty, 'Student Arrival Duty - Parking Lot'],
  [3, '07:30', '08:15', grade5A, socialStudies, '5A SOC (7:30-8:15)'],
  [3, '08:30', '09:30', null, resourceRoom, 'Resource Room Support'],
  [3, '10:45', '11:45', grade6A, socialStudies, '6A SOC'],
  [3, '12:30', '13:30', grade4A, spanish, '4A (12:30-1:30)'],
  
  // JUEVES
  [4, '08:30', '09:30', grade6B, socialStudies, '6B SOC'],
  [4, '10:15', '11:15', grade5A, socialStudies, '5A SOC'],
  [4, '11:15', '12:00', grade4A, spanish, '4A Spanish'],
  
  // VIERNES
  [5, '10:45', '11:45', grade6A, socialStudies, '6A SOC'],
  [5, '11:15', '12:00', grade4A, spanish, '4A Spanish'],
];

let created = 0;
let errors = 0;

for (const [day, startTime, endTime, grade, subject, description] of schedule) {
  if (!subject) {
    console.log(`⚠️  Saltando: ${description} - Subject no encontrado`);
    errors++;
    continue;
  }

  // Buscar time block
  const timeBlock = await p.timeBlock.findFirst({
    where: {
      dayOfWeek: day,
      startTime: startTime,
      endTime: endTime,
      blockType: 'CLASS'
    }
  });

  if (!timeBlock) {
    console.log(`⚠️  Time block no encontrado: Día ${day} ${startTime}-${endTime}`);
    console.log(`   Necesitas crear este bloque primero: ${description}`);
    errors++;
    continue;
  }

  try {
    await p.assignment.create({
      data: {
        teacherId: teacher.id,
        subjectId: subject.id,
        gradeId: grade?.id || null,
        timeBlockId: timeBlock.id,
        status: 'CONFIRMED'
      }
    });
    console.log(`✅ ${description}`);
    created++;
  } catch (error) {
    console.log(`❌ Error: ${description} - ${error.message}`);
    errors++;
  }
}

console.log(`\n📊 RESUMEN:`);
console.log(`   ✅ Creadas: ${created}`);
console.log(`   ❌ Errores: ${errors}`);
console.log(`   📝 Total intentadas: ${schedule.length}\n`);

await p.$disconnect();
