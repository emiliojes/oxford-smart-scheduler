import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gradeId, subjectId } = body;

    const gradeSubject = await prisma.gradeSubject.create({
      data: {
        gradeId,
        subjectId,
      },
    });

    return NextResponse.json(gradeSubject);
  } catch (error) {
    return NextResponse.json({ error: "Error linking grade and subject" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get("gradeId");
    const subjectId = searchParams.get("subjectId");

    if (!gradeId || !subjectId) {
      return NextResponse.json({ error: "gradeId and subjectId are required" }, { status: 400 });
    }

    await prisma.gradeSubject.delete({
      where: {
        gradeId_subjectId: {
          gradeId,
          subjectId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error unlinking grade and subject" }, { status: 500 });
  }
}
