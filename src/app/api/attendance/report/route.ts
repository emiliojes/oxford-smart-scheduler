import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

// GET /api/attendance/report?gradeId=&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!gradeId || !from || !to)
    return NextResponse.json({ error: "gradeId, from, to required" }, { status: 400 });

  try {
    const start = new Date(from);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);

    const [students, records] = await Promise.all([
      prisma.student.findMany({
        where: { gradeId },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      }),
      prisma.attendanceRecord.findMany({
        where: { gradeId, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
      }),
    ]);

    // Build unique dates in range that have records
    const dates = Array.from(new Set(records.map(r => r.date.toISOString().slice(0, 10)))).sort();

    // Build matrix: studentId -> date -> status
    const matrix: Record<string, Record<string, string>> = {};
    for (const s of students) matrix[s.id] = {};
    for (const r of records) {
      const dateKey = r.date.toISOString().slice(0, 10);
      if (matrix[r.studentId]) matrix[r.studentId][dateKey] = r.status;
    }

    // Totals per student
    const totals = students.map(s => {
      const counts: Record<string, number> = { P: 0, DO: 0, UA: 0, EA: 0, UT: 0, FT: 0 };
      for (const d of dates) {
        const st = matrix[s.id][d];
        if (st && counts[st] !== undefined) counts[st]++;
      }
      const totalDays = dates.length;
      const present = counts.P + counts.FT;
      const pct = totalDays > 0 ? Math.round((present / totalDays) * 100) : null;
      return { studentId: s.id, ...counts, totalDays, attendancePct: pct };
    });

    return NextResponse.json({ students, dates, matrix, totals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error generating report" }, { status: 500 });
  }
}
