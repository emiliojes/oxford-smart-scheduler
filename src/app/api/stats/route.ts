import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
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
