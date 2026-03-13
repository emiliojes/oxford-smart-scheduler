import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");

  try {
    const students = await prisma.student.findMany({
      where: gradeId ? { gradeId } : undefined,
      include: { grade: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json(students);
  } catch {
    return NextResponse.json({ error: "Error fetching students" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { firstName, lastName, gradeId } = body;
    if (!firstName || !lastName || !gradeId)
      return NextResponse.json({ error: "firstName, lastName, gradeId required" }, { status: 400 });

    const student = await prisma.student.create({ data: { firstName, lastName, gradeId } });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Error creating student" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, firstName, lastName, gradeId } = body;
    const student = await prisma.student.update({ where: { id }, data: { firstName, lastName, gradeId } });
    return NextResponse.json(student);
  } catch {
    return NextResponse.json({ error: "Error updating student" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await prisma.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error deleting student" }, { status: 500 });
  }
}
