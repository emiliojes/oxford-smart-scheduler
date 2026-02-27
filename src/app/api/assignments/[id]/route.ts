import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateAssignment } from "@/lib/validations";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const { teacherId, subjectId, gradeId, roomId, timeBlockId } = body;

    // 1. Validar conflictos ignorando la asignación actual
    const conflicts = await validateAssignment({
      teacherId,
      subjectId,
      gradeId,
      roomId,
      timeBlockId,
      ignoreAssignmentId: id,
    });

    const hasErrors = conflicts.some((c) => c.severity === "ERROR");
    const status = hasErrors ? "CONFLICT" : "CONFIRMED";

    // 2. Actualizar asignación y sus conflictos
    const assignment = await prisma.assignment.update({
      where: { id },
      data: {
        teacherId,
        subjectId,
        gradeId,
        roomId,
        timeBlockId,
        status,
        conflicts: {
          deleteMany: {},
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
    console.error("Error updating assignment:", error);
    return NextResponse.json({ error: "Error updating assignment" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting assignment" }, { status: 500 });
  }
}
