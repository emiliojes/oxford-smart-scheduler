import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

// POST /api/students/import
// Body: { gradeId: string, students: Array<{ firstName: string, lastName: string }> }
export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { gradeId, students } = body as { gradeId: string; students: { firstName: string; lastName: string }[] };

    if (!gradeId || !Array.isArray(students) || students.length === 0)
      return NextResponse.json({ error: "gradeId and students array required" }, { status: 400 });

    const result = await prisma.student.createMany({
      data: students
        .filter(s => s.firstName?.trim() && s.lastName?.trim())
        .map(s => ({ firstName: s.firstName.trim(), lastName: s.lastName.trim(), gradeId })),
    });

    return NextResponse.json({ imported: result.count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error importing students" }, { status: 500 });
  }
}
