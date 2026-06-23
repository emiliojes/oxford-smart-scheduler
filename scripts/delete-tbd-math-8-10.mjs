import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

console.log('🗑️  ELIMINANDO TEACHER PLACEHOLDER: TBD - MATH 8-10\n');

const tbdTeacher = await p.teacher.findFirst({
  where: { name: { contains: "TBD - Math 8-10" } },
  include: {
    assignments: true,
    subjects: true
  }
});

if (!tbdTeacher) {
  console.log('✓ Teacher ya fue eliminado o no existe');
  await p.$disconnect();
  process.exit(0);
}

console.log(`Teacher encontrado: ${tbdTeacher.name}`);
console.log(`  ID: ${tbdTeacher.id}`);
console.log(`  Asignaciones restantes: ${tbdTeacher.assignments.length}`);
console.log(`  Subjects: ${tbdTeacher.subjects.length}\n`);

if (tbdTeacher.assignments.length > 0) {
  console.log('⚠️  El teacher aún tiene asignaciones. No se puede eliminar.');
  await p.$disconnect();
  process.exit(1);
}

// Eliminar relaciones con subjects primero
await p.teacherSubject.deleteMany({
  where: { teacherId: tbdTeacher.id }
});

console.log('✓ Relaciones con subjects eliminadas');

// Eliminar el teacher
await p.teacher.delete({
  where: { id: tbdTeacher.id }
});

console.log('✅ Teacher "TBD - Math 8-10" eliminado exitosamente\n');

await p.$disconnect();
