import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAssignment } from "@/lib/validations";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  let teacherId = searchParams.get("teacherId");
  const gradeId = searchParams.get("gradeId");
  const roomId = searchParams.get("roomId");

  // TEACHER role: can only see their own assignments
  const linkedTeacherId = (user as any).teacherId ?? null;
  if ((user as any).role === "TEACHER" && linkedTeacherId) {
    teacherId = linkedTeacherId;
  }

  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        ...(teacherId && { teacherId }),
        ...((user as any).role !== "TEACHER" && gradeId && { gradeId }),
        ...((user as any).role !== "TEACHER" && roomId && { roomId }),
      },
      include: {
        teacher: true,
        subject: true,
        grade: true,
        room: true,
        timeBlock: true,
        conflicts: true,
      },
    });
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { teacherId, subjectId, gradeId, roomId, timeBlockId } = body;

    // 1. Validar conflictos
    const conflicts = await validateAssignment({
      teacherId,
      subjectId,
      gradeId,
      roomId,
      timeBlockId,
    });

    // 2. Determinar estado basado en conflictos de severidad ERROR
    const hasErrors = conflicts.some((c) => c.severity === "ERROR");
    const status = hasErrors ? "CONFLICT" : "CONFIRMED";

    // 3. Crear asignación
    const assignment = await prisma.assignment.create({
      data: {
        teacherId,
        subjectId,
        gradeId,
        roomId,
        timeBlockId,
        status,
        conflicts: {
          create: conflicts.map((c) => ({
            conflictType: c.type,
            description: c.description,
            severity: c.severity,
          })),
        },
      },
      include: {
        teacher: true,
        subject: true,
        grade: true,
        room: true,
        timeBlock: true,
        conflicts: true,
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ error: "Error creating assignment" }, { status: 500 });
  }
}
