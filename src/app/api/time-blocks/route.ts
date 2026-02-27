import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const level = searchParams.get("level");

  try {
    const timeBlocks = await prisma.timeBlock.findMany({
      where: {
        ...(level && { level: { in: [level, "BOTH"] } }),
      },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });
    return NextResponse.json(timeBlocks);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching time blocks" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { dayOfWeek, startTime, duration, level, blockType } = body;

    const timeBlock = await prisma.timeBlock.create({
      data: {
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        duration,
        level,
        blockType: blockType || "CLASS",
      },
    });

    return NextResponse.json(timeBlock);
  } catch (error) {
    return NextResponse.json({ error: "Error creating time block" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, dayOfWeek, startTime, duration, level, blockType } = body;

    const timeBlock = await prisma.timeBlock.update({
      where: { id },
      data: {
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        duration,
        level,
        blockType: blockType || "CLASS",
      },
    });

    return NextResponse.json(timeBlock);
  } catch (error) {
    return NextResponse.json({ error: "Error updating time block" }, { status: 500 });
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

    await prisma.timeBlock.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting time block" }, { status: 500 });
  }
}
