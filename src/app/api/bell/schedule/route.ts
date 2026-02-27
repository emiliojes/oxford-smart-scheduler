import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET() {
  const user = await validateApiRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const schedules = await prisma.bellSchedule.findMany({
      orderBy: [
        { dayOfWeek: "asc" },
        { time: "asc" },
      ],
    });
    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching bell schedules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { dayOfWeek, time, duration, pattern, level } = body;

    const schedule = await prisma.bellSchedule.create({
      data: {
        dayOfWeek: parseInt(dayOfWeek),
        time,
        duration: parseInt(duration),
        pattern,
        level,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json({ error: "Error creating bell schedule" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, dayOfWeek, time, duration, pattern, level } = body;

    const schedule = await prisma.bellSchedule.update({
      where: { id },
      data: {
        dayOfWeek: parseInt(dayOfWeek),
        time,
        duration: parseInt(duration),
        pattern,
        level,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    return NextResponse.json({ error: "Error updating bell schedule" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.bellSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting bell schedule" }, { status: 500 });
  }
}
