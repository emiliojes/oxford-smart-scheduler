import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        teachers: {
          include: {
            teacher: true,
          },
        },
        grades: {
          include: {
            grade: true,
          },
        },
      },
    });
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching subjects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, level, weeklyFrequency, defaultDuration, requiresSpecialRoom, specialRoomType } = body;

    const subject = await prisma.subject.create({
      data: {
        name,
        level,
        weeklyFrequency: parseInt(weeklyFrequency),
        defaultDuration,
        requiresSpecialRoom,
        specialRoomType,
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    return NextResponse.json({ error: "Error creating subject" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, level, weeklyFrequency, defaultDuration, requiresSpecialRoom, specialRoomType } = body;

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name,
        level,
        weeklyFrequency: parseInt(weeklyFrequency),
        defaultDuration,
        requiresSpecialRoom: !!requiresSpecialRoom,
        specialRoomType,
      },
    });

    return NextResponse.json(subject);
  } catch (error) {
    return NextResponse.json({ error: "Error updating subject" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting subject" }, { status: 500 });
  }
}
