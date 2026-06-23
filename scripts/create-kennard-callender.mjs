import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('👨‍🏫 CREANDO TEACHER: KENNARD CALLENDER (MATH 8-10)\n');

// Verificar si ya existe
const existing = await p.teacher.findFirst({
  where: { name: { contains: "Kennard" } }
});

if (existing) {
  console.log('✓ Teacher ya existe:', existing.name);
  console.log('   ID:', existing.id);
  await p.$disconnect();
  process.exit(0);
}

// Buscar el subject Math
const mathSubject = await p.subject.findFirst({
  where: { name: "Math" }
});

if (!mathSubject) {
  console.log('❌ Subject Math no encontrado');
  await p.$disconnect();
  process.exit(1);
}

// Crear el teacher
const teacher = await p.teacher.create({
  data: {
    name: "Kennard Callender",
    level: "BOTH",
    maxWeeklyHours: 25,
    subjects: {
      create: {
        subjectId: mathSubject.id
      }
    }
  },
  include: {
    subjects: {
      include: {
        subject: true
      }
    }
  }
});

console.log('✅ Teacher creado exitosamente:');
console.log('   Nombre:', teacher.name);
console.log('   ID:', teacher.id);
console.log('   Nivel:', teacher.level);
console.log('   Max horas semanales:', teacher.maxWeeklyHours);
console.log('   Materias:', teacher.subjects.map(s => s.subject.name).join(', '));

console.log('\n📋 Siguiente paso: Transferir asignaciones de "TBD - Math 8-10" a Kennard Callender');

await p.$disconnect();
