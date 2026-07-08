import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { area, startTime, endTime, dayPattern, isClosed, level, teacherId } = await request.json();
    const duty = await prisma.supervisionDuty.update({
      where: { id: params.id },
      data: {
        area,
        startTime,
        endTime,
        dayPattern,
        isClosed: isClosed ?? false,
        level: level ?? "SECONDARY",
        teacherId: isClosed ? null : (teacherId || null),
      },
      include: { teacher: { select: { id: true, name: true } } },
    });
    return NextResponse.json(duty);
  } catch (e) {
    return NextResponse.json({ error: "Error updating duty" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.supervisionDuty.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Error deleting duty" }, { status: 500 });
  }
}
