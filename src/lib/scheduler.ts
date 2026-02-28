import prisma from "@/lib/prisma";

/**
 * Greedy scheduler: assigns as many classes as possible without conflicts.
 * Reports unresolved slots instead of failing completely.
 */
export async function generateAutoSchedule(level: "PRIMARY" | "SECONDARY") {
  // 1. Load data
  const [teachers, grades, rooms, timeBlocks, teacherSubjects] = await Promise.all([
    prisma.teacher.findMany({ where: { level: { in: [level, "BOTH"] } }, include: { subjects: true } }),
    prisma.grade.findMany({ where: { level }, include: { subjects: { include: { subject: true } } } }),
    prisma.room.findMany(),
    prisma.timeBlock.findMany({ where: { level: { in: [level, "BOTH"] }, blockType: "CLASS" } }),
    prisma.teacherSubject.findMany(),
  ]);

  // 2. Clear previous assignments for this level
  await prisma.assignment.deleteMany({ where: { grade: { level } } });

  // 3. In-memory tracking to avoid conflicts without extra DB queries
  // key = "teacherId:timeBlockId" | "gradeId:timeBlockId" | "roomId:timeBlockId"
  const usedSlots = new Set<string>();

  // Teacher weekly hours tracking
  const teacherHours: Record<string, number> = {};
  teachers.forEach((t) => { teacherHours[t.id] = 0; });

  // Map subjectId -> teacher IDs that can teach it (filtered to this level)
  const teacherIds = new Set(teachers.map((t) => t.id));
  const subjectTeachers: Record<string, string[]> = {};
  for (const ts of teacherSubjects) {
    if (!teacherIds.has(ts.teacherId)) continue;
    if (!subjectTeachers[ts.subjectId]) subjectTeachers[ts.subjectId] = [];
    subjectTeachers[ts.subjectId].push(ts.teacherId);
  }

  // Shuffle helper
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  let assigned = 0;
  let skipped = 0;

  const shuffledTimeBlocks = shuffle(timeBlocks);
  const shuffledRooms = shuffle(rooms);

  // 4. For each grade, for each subject, assign required weekly slots
  for (const grade of grades) {
    for (const gs of grade.subjects) {
      const subject = gs.subject;
      const needed = subject.weeklyFrequency;
      const possibleTeachers = subjectTeachers[subject.id] ?? [];

      if (possibleTeachers.length === 0) {
        skipped += needed;
        continue;
      }

      let assignedForThis = 0;

      for (const timeBlock of shuffledTimeBlocks) {
        if (assignedForThis >= needed) break;

        // Grade must be free at this time
        if (usedSlots.has(`grade:${grade.id}:${timeBlock.id}`)) continue;

        // Find an available teacher for this subject at this time
        const availableTeacher = possibleTeachers.find((tid) => {
          const teacher = teachers.find((t) => t.id === tid);
          if (!teacher) return false;
          if (usedSlots.has(`teacher:${tid}:${timeBlock.id}`)) return false;
          const maxHours = teacher.maxWeeklyHours ?? 27;
          if ((teacherHours[tid] ?? 0) >= maxHours) return false;
          return true;
        });

        if (!availableTeacher) continue;

        // Find an available room
        const needsSpecialRoom = subject.requiresSpecialRoom;
        const specialType = subject.specialRoomType;
        const availableRoom = shuffledRooms.find((r) => {
          if (usedSlots.has(`room:${r.id}:${timeBlock.id}`)) return false;
          if (needsSpecialRoom) return r.isSpecialized && r.specializedFor === specialType;
          return !r.isSpecialized;
        });

        if (!availableRoom) continue;

        // Assign
        await prisma.assignment.create({
          data: {
            teacherId: availableTeacher,
            subjectId: subject.id,
            gradeId: grade.id,
            roomId: availableRoom.id,
            timeBlockId: timeBlock.id,
            status: "CONFIRMED",
          },
        });

        usedSlots.add(`grade:${grade.id}:${timeBlock.id}`);
        usedSlots.add(`teacher:${availableTeacher}:${timeBlock.id}`);
        usedSlots.add(`room:${availableRoom.id}:${timeBlock.id}`);
        teacherHours[availableTeacher] = (teacherHours[availableTeacher] ?? 0) + 1;

        assignedForThis++;
        assigned++;
      }

      if (assignedForThis < needed) {
        skipped += needed - assignedForThis;
      }
    }
  }

  const success = skipped === 0;
  return { success, assigned, skipped };
}
