import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get("teacherId");

  const duties = await prisma.supervisionDuty.findMany({
    where: teacherId ? { teacherId } : undefined,
    include: { teacher: { select: { id: true, name: true } } },
    orderBy: [{ area: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(duties);
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { area, startTime, endTime, dayPattern, isClosed, level, teacherId } = body;
    if (!area || !startTime || !endTime || !dayPattern)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const duty = await prisma.supervisionDuty.create({
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
    return NextResponse.json({ error: "Error creating duty" }, { status: 500 });
  }
}
