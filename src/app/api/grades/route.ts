import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET() {
  const user = await validateApiRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const grades = await prisma.grade.findMany({
      include: {
        subjects: {
          include: {
            subject: true,
          },
        },
      },
    });
    return NextResponse.json(grades);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching grades" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, section, level, studentCount, subjectCount, subjectIds } = body;

    const grade = await prisma.grade.create({
      data: {
        name,
        section,
        level,
        studentCount: parseInt(studentCount),
        subjectCount: parseInt(subjectCount),
        subjects: {
          create: subjectIds?.map((id: string) => ({
            subject: { connect: { id } },
          })),
        },
      },
    });

    return NextResponse.json(grade);
  } catch (error) {
    return NextResponse.json({ error: "Error creating grade" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, name, section, level, studentCount, subjectCount } = body;

    const grade = await prisma.grade.update({
      where: { id },
      data: {
        name,
        section,
        level,
        studentCount: parseInt(studentCount),
        subjectCount: parseInt(subjectCount),
      },
    });

    return NextResponse.json(grade);
  } catch (error) {
    return NextResponse.json({ error: "Error updating grade" }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: "Grade ID is required" }, { status: 400 });
    }

    await prisma.grade.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting grade" }, { status: 500 });
  }
}
