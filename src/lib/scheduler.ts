import prisma from "@/lib/prisma";
import { validateAssignment, ConflictResult } from "./validations";

interface ScheduleRequirement {
  gradeId: string;
  subjectId: string;
  requiredHours: number;
}

interface AssignedClass {
  teacherId: string;
  subjectId: string;
  gradeId: string;
  roomId: string;
  timeBlockId: string;
}

/**
 * Algoritmo de generación automática de horarios usando CSP (Constraint Satisfaction Problem)
 * con backtracking y heurísticas básicas.
 */
export async function generateAutoSchedule(level: "PRIMARY" | "SECONDARY") {
  // 1. Cargar datos necesarios
  const [teachers, subjects, grades, rooms, timeBlocks] = await Promise.all([
    prisma.teacher.findMany({ where: { level: { in: [level, "BOTH"] } } }),
    prisma.subject.findMany({ where: { level: { in: [level, "BOTH"] } } }),
    prisma.grade.findMany({ where: { level: level } }),
    prisma.room.findMany(),
    prisma.timeBlock.findMany({ where: { level: { in: [level, "BOTH"] }, blockType: "CLASS" } }),
  ]);

  // 2. Construir lista de requerimientos (qué clases hay que dar y cuántas horas)
  const requirements: ScheduleRequirement[] = [];
  for (const grade of grades) {
    const gradeSubjects = await prisma.gradeSubject.findMany({
      where: { gradeId: grade.id },
      include: { subject: true },
    });

    for (const gs of gradeSubjects) {
      requirements.push({
        gradeId: grade.id,
        subjectId: gs.subjectId,
        requiredHours: gs.subject.weeklyFrequency,
      });
    }
  }

  // 3. Obtener mapeo de profesores por materia
  const teacherSubjects = await prisma.teacherSubject.findMany();
  const getTeachersForSubject = (subjectId: string) => {
    return teacherSubjects
      .filter((ts) => ts.subjectId === subjectId)
      .map((ts) => ts.teacherId)
      .filter((tid) => teachers.some((t) => t.id === tid));
  };

  const assignments: AssignedClass[] = [];

  // 4. Función recursiva de backtracking
  async function solve(reqIndex: number, hourInReq: number): Promise<boolean> {
    // Si hemos procesado todos los requerimientos, terminamos
    if (reqIndex >= requirements.length) return true;

    const currentReq = requirements[reqIndex];
    
    // Si ya completamos las horas de este requerimiento, pasamos al siguiente
    if (hourInReq >= currentReq.requiredHours) {
      return solve(reqIndex + 1, 0);
    }

    const possibleTeachers = getTeachersForSubject(currentReq.subjectId);
    
    // Barajar opciones para aleatoriedad (opcional, ayuda a no generar siempre lo mismo)
    const shuffledTimeBlocks = [...timeBlocks].sort(() => Math.random() - 0.5);
    const shuffledRooms = [...rooms].sort(() => Math.random() - 0.5);

    for (const teacherId of possibleTeachers) {
      for (const timeBlock of shuffledTimeBlocks) {
        for (const room of shuffledRooms) {
          // Validar si esta combinación es posible
          const conflicts = await validateAssignment({
            teacherId,
            subjectId: currentReq.subjectId,
            gradeId: currentReq.gradeId,
            roomId: room.id,
            timeBlockId: timeBlock.id,
          });

          const hasErrors = conflicts.some((c) => c.severity === "ERROR");

          if (!hasErrors) {
            // Realizar asignación tentativa
            const newAssignment: AssignedClass = {
              teacherId,
              subjectId: currentReq.subjectId,
              gradeId: currentReq.gradeId,
              roomId: room.id,
              timeBlockId: timeBlock.id,
            };

            // Guardar temporalmente en DB para que validateAssignment lo vea (o simularlo)
            // Para simplicidad en este prototipo, vamos a usar una transacción o similar
            // Pero validateAssignment consulta la DB real.
            // MEJOR: Crear la asignación real y si falla el backtracking, borrarla.
            const created = await prisma.assignment.create({
              data: {
                ...newAssignment,
                status: "CONFIRMED",
              }
            });

            if (await solve(reqIndex, hourInReq + 1)) {
              return true;
            }

            // Backtrack: borrar la asignación si no llevó a una solución
            await prisma.assignment.delete({ where: { id: created.id } });
          }
        }
      }
    }

    return false;
  }

  // 5. Limpiar asignaciones previas del nivel para regenerar
  await prisma.assignment.deleteMany({
    where: { grade: { level: level } }
  });

  // 6. Iniciar proceso
  const success = await solve(0, 0);
  
  return { success };
}
