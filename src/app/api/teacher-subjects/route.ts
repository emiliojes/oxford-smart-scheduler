import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { teacherId, subjectId } = body;

    const teacherSubject = await prisma.teacherSubject.create({
      data: {
        teacherId,
        subjectId,
      },
    });

    return NextResponse.json(teacherSubject);
  } catch (error) {
    return NextResponse.json({ error: "Error linking teacher and subject" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get("teacherId");
    const subjectId = searchParams.get("subjectId");

    if (!teacherId || !subjectId) {
      return NextResponse.json({ error: "teacherId and subjectId are required" }, { status: 400 });
    }

    await prisma.teacherSubject.delete({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error unlinking teacher and subject" }, { status: 500 });
  }
}
