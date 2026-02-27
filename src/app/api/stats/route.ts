import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET() {
  const user = await validateApiRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [teachers, subjects, grades, rooms, assignments, conflicts] = await Promise.all([
      prisma.teacher.count(),
      prisma.subject.count(),
      prisma.grade.count(),
      prisma.room.count(),
      prisma.assignment.count(),
      prisma.conflict.count({ where: { resolved: false } }),
    ]);

    return NextResponse.json({
      teachers,
      subjects,
      grades,
      rooms,
      assignments,
      conflicts,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching stats" }, { status: 500 });
  }
}
