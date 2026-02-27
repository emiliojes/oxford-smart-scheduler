import prisma from "@/lib/prisma";

export type ConflictType = 
  | "TEACHER_DOUBLE_BOOKING"
  | "ROOM_DOUBLE_BOOKING"
  | "GRADE_DOUBLE_BOOKING"
  | "ROOM_CAPACITY_EXCEEDED"
  | "TEACHER_MAX_HOURS_EXCEEDED"
  | "SECONDARY_DURATION_INVALID";

export interface ConflictResult {
  type: ConflictType;
  severity: "ERROR" | "WARNING";
  description: string;
}

/**
 * Valida una asignación potencial contra las reglas de negocio y las asignaciones existentes.
 */
export async function validateAssignment(data: {
  teacherId: string;
  subjectId: string;
  gradeId: string;
  roomId: string;
  timeBlockId: string;
  ignoreAssignmentId?: string; // Para validaciones durante ediciones
}): Promise<ConflictResult[]> {
  const conflicts: ConflictResult[] = [];

  // 1. Obtener datos necesarios
  const [teacher, subject, grade, room, timeBlock] = await Promise.all([
    prisma.teacher.findUnique({ where: { id: data.teacherId } }),
    prisma.subject.findUnique({ where: { id: data.subjectId } }),
    prisma.grade.findUnique({ where: { id: data.gradeId } }),
    prisma.room.findUnique({ where: { id: data.roomId } }),
    prisma.timeBlock.findUnique({ where: { id: data.timeBlockId } }),
  ]);

  if (!teacher || !subject || !grade || !room || !timeBlock) {
    throw new Error("Missing required data for validation");
  }

  // 2. Validaciones de Choques (Doble Reserva)
  const existingAssignments = await prisma.assignment.findMany({
    where: {
      timeBlockId: data.timeBlockId,
      id: { not: data.ignoreAssignmentId },
    },
  });

  // Choque de Profesor
  if (existingAssignments.some((a) => a.teacherId === data.teacherId)) {
    conflicts.push({
      type: "TEACHER_DOUBLE_BOOKING",
      severity: "ERROR",
      description: "validations.teacherDoubleBooking",
    });
  }

  // Choque de Aula
  if (existingAssignments.some((a) => a.roomId === data.roomId)) {
    conflicts.push({
      type: "ROOM_DOUBLE_BOOKING",
      severity: "ERROR",
      description: "validations.roomDoubleBooking",
    });
  }

  // Choque de Grado
  if (existingAssignments.some((a) => a.gradeId === data.gradeId)) {
    conflicts.push({
      type: "GRADE_DOUBLE_BOOKING",
      severity: "ERROR",
      description: "validations.gradeDoubleBooking",
    });
  }

  // 3. Validaciones de Capacidad
  if (grade.studentCount > room.capacity) {
    conflicts.push({
      type: "ROOM_CAPACITY_EXCEEDED",
      severity: "ERROR",
      description: "validations.roomCapacityExceeded",
    });
  }

  // Límite especial de Computing (según encuesta)
  if (room.specializedFor === "Computing" && grade.studentCount > 30) {
    conflicts.push({
      type: "ROOM_CAPACITY_EXCEEDED",
      severity: "ERROR",
      description: "validations.computingLimit",
    });
  }

  // 4. Validación de Horas Máximas del Profesor
  const teacherCurrentAssignments = await prisma.assignment.findMany({
    where: {
      teacherId: data.teacherId,
      id: { not: data.ignoreAssignmentId },
    },
    include: { timeBlock: true },
  });

  // Calculamos horas (asumiendo que cada bloque tiene una duración asociada)
  let totalHours = 0;
  teacherCurrentAssignments.forEach((a) => {
    if (a.timeBlock.duration === "SIXTY") totalHours += 1;
    else if (a.timeBlock.duration === "FORTYFIVE") totalHours += 0.75;
    else if (a.timeBlock.duration === "THIRTY") totalHours += 0.5;
  });

  // Sumar el nuevo bloque
  if (timeBlock.duration === "SIXTY") totalHours += 1;
  else if (timeBlock.duration === "FORTYFIVE") totalHours += 0.75;
  else if (timeBlock.duration === "THIRTY") totalHours += 0.5;

  if (totalHours > teacher.maxWeeklyHours) {
    conflicts.push({
      type: "TEACHER_MAX_HOURS_EXCEEDED",
      severity: "WARNING",
      description: "validations.teacherMaxHours",
    });
  }

  // 5. Validación de Duración en Secundaria (según encuesta: secundaria siempre 60 min)
  if (grade.level === "SECONDARY" && timeBlock.duration !== "SIXTY") {
    conflicts.push({
      type: "SECONDARY_DURATION_INVALID",
      severity: "ERROR",
      description: "validations.secondaryDuration",
    });
  }

  return conflicts;
}
