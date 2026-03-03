import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixConflicts() {
  console.log("=== VERIFICAR Y LIMPIAR CONFLICTOS ===\n");

  // Get all conflicts with their assignments
  const conflicts = await prisma.conflict.findMany({
    include: {
      assignment: {
        include: { teacher: true, subject: true, timeBlock: true, grade: true }
      }
    }
  });

  console.log(`Total conflictos en DB: ${conflicts.length}`);

  let deleted = 0;
  for (const c of conflicts) {
    const a = c.assignment;
    const slotAssignments = await prisma.assignment.findMany({
      where: { timeBlockId: a.timeBlockId, id: { not: a.id } }
    });

    const teacherConflict = slotAssignments.some(x => x.teacherId === a.teacherId);
    const roomConflict = a.roomId ? slotAssignments.some(x => x.roomId === a.roomId) : false;
    const gradeConflict = a.gradeId ? slotAssignments.some(x => x.gradeId === a.gradeId) : false;

    // SECONDARY_DURATION_INVALID: stale if duration is numeric 60 (valid)
    const durationMins = parseFloat(String(a.timeBlock.duration ?? 0));
    const isSixtyMin = a.timeBlock.duration === "SIXTY" || durationMins === 60;
    const secondaryStale = c.conflictType === "SECONDARY_DURATION_INVALID" && isSixtyMin;

    const stillValid = (!secondaryStale && c.conflictType === "SECONDARY_DURATION_INVALID")
      || (c.conflictType === "TEACHER_DOUBLE_BOOKING" && teacherConflict)
      || (c.conflictType === "ROOM_DOUBLE_BOOKING" && roomConflict)
      || (c.conflictType === "GRADE_DOUBLE_BOOKING" && gradeConflict);

    if (!stillValid) {
      console.log(`  STALE → ${a.teacher.name} | ${a.subject.name} | día ${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | ${c.conflictType}`);
      await prisma.conflict.delete({ where: { id: c.id } });
      deleted++;
    } else {
      console.log(`  OK    → ${a.teacher.name} | ${a.subject.name} | día ${a.timeBlock.dayOfWeek} ${a.timeBlock.startTime} | ${c.conflictType}`);
    }
  }

  // Update assignment status where no conflicts remain
  const assignments = await prisma.assignment.findMany({
    where: { status: "CONFLICT" },
    include: { conflicts: true }
  });
  let fixed = 0;
  for (const a of assignments) {
    if (a.conflicts.length === 0) {
      await prisma.assignment.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });
      fixed++;
    }
  }

  console.log(`\nConflictos eliminados (obsoletos): ${deleted}`);
  console.log(`Assignments corregidos a CONFIRMED: ${fixed}`);
}

fixConflicts().catch(console.error).finally(() => prisma.$disconnect());
