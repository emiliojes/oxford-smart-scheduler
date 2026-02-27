import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    return NextResponse.json(teachers);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching teachers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, level, primaryType, maxWeeklyHours, subjectIds } = body;

    const teacher = await prisma.teacher.create({
      data: {
        name,
        email: email === "" ? null : email,
        level,
        primaryType,
        maxWeeklyHours: parseInt(maxWeeklyHours) || 27,
        subjects: {
          create: subjectIds?.map((id: string) => ({
            subject: { connect: { id } },
          })),
        },
      },
    });

    return NextResponse.json(teacher);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "emailInUse" }, { status: 400 });
    }
    return NextResponse.json({ error: "errorSaving" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, email, level, primaryType, maxWeeklyHours } = body;

    const teacher = await prisma.teacher.update({
      where: { id },
      data: {
        name,
        email: email === "" ? null : email,
        level,
        primaryType,
        maxWeeklyHours: parseInt(maxWeeklyHours) || 27,
      },
    });

    return NextResponse.json(teacher);
  } catch (error: any) {
    console.error(error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "emailInUse" }, { status: 400 });
    }
    return NextResponse.json({ error: "errorSaving" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Teacher ID is required" }, { status: 400 });
    }

    await prisma.teacher.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting teacher" }, { status: 500 });
  }
}
