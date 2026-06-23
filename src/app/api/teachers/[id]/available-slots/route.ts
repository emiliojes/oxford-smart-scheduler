import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const day = parseInt(searchParams.get('day') || '1');

    // Obtener todas las asignaciones del teacher en ese día
    const teacherAssignments = await prisma.assignment.findMany({
      where: {
        teacherId: id,
        timeBlock: { dayOfWeek: day }
      },
      include: {
        timeBlock: true
      }
    });

    // Obtener todos los bloques de ese día
    const allBlocks = await prisma.timeBlock.findMany({
      where: {
        dayOfWeek: day,
        blockType: 'CLASS'
      },
      orderBy: { startTime: 'asc' }
    });

    // Filtrar bloques que no están ocupados
    const occupiedBlockIds = new Set(teacherAssignments.map(a => a.timeBlockId));
    const availableSlots = allBlocks.filter(block => !occupiedBlockIds.has(block.id));

    return NextResponse.json({
      slots: availableSlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        level: slot.level
      }))
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json({ error: 'Failed to fetch available slots' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
