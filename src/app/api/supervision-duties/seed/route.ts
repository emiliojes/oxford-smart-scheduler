import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

// Helper: find teacher by name (partial, case-insensitive)
async function findTeacher(name: string) {
  const all = await prisma.teacher.findMany({ select: { id: true, name: true } });
  const lower = name.toLowerCase().trim();
  const exact = all.find(t => t.name.toLowerCase() === lower);
  if (exact) return exact.id;
  // partial match on last name
  const partial = all.find(t => t.name.toLowerCase().includes(lower.split(" ").pop()!.toLowerCase()));
  return partial?.id ?? null;
}

const SEED_DATA = [
  // ── Lunch Supervision ──────────────────────────────────────────────────
  { area: "Playground Area / Ping Pong Tables", startTime: "12:45", endTime: "13:15", dayPattern: "EVERYDAY",    teacher: "Catur Salomon" },
  { area: "Playground Area / Ping Pong Tables", startTime: "12:45", endTime: "13:15", dayPattern: "WED",         teacher: "Andrea Concepcion" },

  { area: "Football Court",                     startTime: "13:00", endTime: "13:15", dayPattern: "MON",         teacher: "Ricardo Ferran" },
  { area: "Football Court",                     startTime: "13:00", endTime: "13:15", dayPattern: "TUE",         teacher: "Conrado de Leon" },
  { area: "Football Court",                     startTime: "13:00", endTime: "13:15", dayPattern: "WED",         teacher: "Emilio Nunez" },
  { area: "Football Court",                     startTime: "13:00", endTime: "13:15", dayPattern: "THU",         teacher: "Christian Ho Sang" },

  { area: "Gym",                                startTime: "12:45", endTime: "13:15", dayPattern: "MON",         teacher: "Manuel Abrego" },
  { area: "Gym",                                startTime: "12:45", endTime: "13:15", dayPattern: "TUE",         teacher: "Aristides Guerra" },
  { area: "Gym",                                startTime: "12:45", endTime: "13:15", dayPattern: "WED",         teacher: "Vanessa Munoz" },
  { area: "Gym",                                startTime: "12:45", endTime: "13:15", dayPattern: "THU",         teacher: "Ricardo Ferran" },

  { area: "Cafeteria",                          startTime: "12:45", endTime: "13:15", dayPattern: "MON",         teacher: "Vielka Vega" },
  { area: "Cafeteria",                          startTime: "12:45", endTime: "13:15", dayPattern: "MON",         teacher: "Irlanda Tunon" },
  { area: "Cafeteria",                          startTime: "12:45", endTime: "13:15", dayPattern: "TUE",         teacher: "Maria Pitti" },
  { area: "Cafeteria",                          startTime: "12:45", endTime: "13:15", dayPattern: "WED",         teacher: "Elida Barria" },
  { area: "Cafeteria",                          startTime: "12:45", endTime: "13:15", dayPattern: "THU",         teacher: "Enis Rodriguez" },

  { area: "School Bus Area",                    startTime: "12:45", endTime: "13:15", dayPattern: "MON",         teacher: "Adolfo Diaz" },
  { area: "School Bus Area",                    startTime: "12:45", endTime: "13:15", dayPattern: "TUE",         teacher: "Kennar Callender" },
  { area: "School Bus Area",                    startTime: "12:45", endTime: "13:15", dayPattern: "WED",         teacher: "Karina Penalba" },
  { area: "School Bus Area",                    startTime: "12:45", endTime: "13:15", dayPattern: "THU",         teacher: "Judith Gil" },

  { area: "Washrooms / Downstairs",             startTime: "12:45", endTime: "13:15", dayPattern: "TUE_AND_THU", teacher: "Arlex Alvarado" },
  { area: "Washrooms / Downstairs",             startTime: "12:45", endTime: "13:15", dayPattern: "MON_TO_THU",  teacher: "Deisy Vega" },

  // ── Morning Break Supervision ──────────────────────────────────────────
  { area: "Playground Area / Ping Pong Tables", startTime: "09:30", endTime: "09:45", dayPattern: "MON_TO_FRI",  teacher: "Karina Penalba" },
  { area: "Playground Area",                    startTime: "09:30", endTime: "09:45", dayPattern: "MON_TO_THU",  teacher: "Arlex Alvarado" },
  { area: "Washrooms / Downstairs",             startTime: "09:30", endTime: "09:45", dayPattern: "MON_TO_FRI",  teacher: "Christian Ho Sang" },
  { area: "Gym",                                startTime: "09:30", endTime: "09:45", dayPattern: "MON_TO_FRI",  teacher: null, isClosed: true },
];

export async function POST() {
  const user = await validateApiRequest(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if already seeded
  const existing = await prisma.supervisionDuty.count();
  if (existing > 0) {
    return NextResponse.json({ error: "Supervision duties already exist. Delete all first." }, { status: 409 });
  }

  const results: { area: string; teacher: string | null; ok: boolean; note?: string }[] = [];

  for (const item of SEED_DATA) {
    let teacherId: string | null = null;
    if (!item.isClosed && item.teacher) {
      teacherId = await findTeacher(item.teacher);
      if (!teacherId) {
        results.push({ area: item.area, teacher: item.teacher, ok: false, note: "Teacher not found" });
        continue;
      }
    }
    await prisma.supervisionDuty.create({
      data: {
        area: item.area,
        startTime: item.startTime,
        endTime: item.endTime,
        dayPattern: item.dayPattern,
        isClosed: item.isClosed ?? false,
        level: "SECONDARY",
        teacherId,
      },
    });
    results.push({ area: item.area, teacher: item.teacher, ok: true });
  }

  const failed = results.filter(r => !r.ok);
  return NextResponse.json({ created: results.filter(r => r.ok).length, failed });
}

export async function DELETE() {
  const user = await validateApiRequest(["ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count } = await prisma.supervisionDuty.deleteMany({});
  return NextResponse.json({ deleted: count });
}
