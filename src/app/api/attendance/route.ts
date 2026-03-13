import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

// GET /api/attendance?gradeId=&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gradeId = searchParams.get("gradeId");
  const date = searchParams.get("date");

  if (!gradeId || !date)
    return NextResponse.json({ error: "gradeId and date required" }, { status: 400 });

  try {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        gradeId,
        date: { gte: start, lte: end },
      },
      include: { student: true },
    });
    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: "Error fetching attendance" }, { status: 500 });
  }
}

// POST /api/attendance  — upsert single record
// Body: { studentId, gradeId, date, status, note?, takenById }
export async function POST(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { studentId, gradeId, date, status, note, takenById } = body;

    const VALID = ["P", "DO", "UA", "EA", "UT", "FT"];
    if (!VALID.includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);

    const record = await prisma.attendanceRecord.upsert({
      where: { studentId_date: { studentId, date: d } },
      update: { status, note: note ?? null, takenById },
      create: { studentId, gradeId, date: d, status, note: note ?? null, takenById },
    });

    return NextResponse.json(record);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error saving attendance" }, { status: 500 });
  }
}

// PATCH /api/attendance — bulk upsert for a whole grade+date
// Body: { gradeId, date, records: [{studentId, status, note?}], takenById }
export async function PATCH(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { gradeId, date, records, takenById } = body as {
      gradeId: string;
      date: string;
      records: { studentId: string; status: string; note?: string }[];
      takenById: string;
    };

    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);

    const VALID = ["P", "DO", "UA", "EA", "UT", "FT"];
    const ops = records
      .filter(r => VALID.includes(r.status))
      .map(r =>
        prisma.attendanceRecord.upsert({
          where: { studentId_date: { studentId: r.studentId, date: d } },
          update: { status: r.status, note: r.note ?? null, takenById },
          create: { studentId: r.studentId, gradeId, date: d, status: r.status, note: r.note ?? null, takenById },
        })
      );

    const results = await prisma.$transaction(ops);
    return NextResponse.json({ saved: results.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error saving attendance" }, { status: 500 });
  }
}
