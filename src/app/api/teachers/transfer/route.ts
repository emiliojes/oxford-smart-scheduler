import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { fromTeacherId, toTeacherId } = await request.json();

    if (!fromTeacherId || !toTeacherId) {
      return NextResponse.json(
        { error: "fromTeacherId and toTeacherId are required" },
        { status: 400 }
      );
    }

    // Verificar que ambos teachers existen
    const [fromTeacher, toTeacher] = await Promise.all([
      prisma.teacher.findUnique({ where: { id: fromTeacherId } }),
      prisma.teacher.findUnique({ where: { id: toTeacherId } })
    ]);

    if (!fromTeacher || !toTeacher) {
      return NextResponse.json(
        { error: "One or both teachers not found" },
        { status: 404 }
      );
    }

    // Contar asignaciones a transferir
    const count = await prisma.assignment.count({
      where: { teacherId: fromTeacherId }
    });

    // Transferir todas las asignaciones
    const result = await prisma.assignment.updateMany({
      where: { teacherId: fromTeacherId },
      data: { teacherId: toTeacherId }
    });

    return NextResponse.json({
      success: true,
      fromTeacher: fromTeacher.name,
      toTeacher: toTeacher.name,
      transferredCount: result.count,
      message: `${result.count} assignments transferred from ${fromTeacher.name} to ${toTeacher.name}`
    });

  } catch (error) {
    console.error("Error transferring assignments:", error);
    return NextResponse.json(
      { error: "Failed to transfer assignments" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
