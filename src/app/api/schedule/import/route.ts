import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest } from "@/lib/auth-api";
import prisma from "@/lib/prisma";

// POST /api/schedule/import
// Body: { csv: string, clearLevel?: string }
export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { csv, clearLevel } = await request.json();
    if (!csv) return NextResponse.json({ error: "No CSV provided" }, { status: 400 });

    // Load lookup tables once
    const [teachers, subjects, grades, rooms, timeBlocks] = await Promise.all([
      prisma.teacher.findMany(),
      prisma.subject.findMany(),
      prisma.grade.findMany(),
      prisma.room.findMany(),
      prisma.timeBlock.findMany(),
    ]);

    const normalize = (s: string) =>
      s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const byName = <T extends { name: string }>(arr: T[], name: string): T | undefined =>
      arr.find((x) => normalize(x.name) === normalize(name));

    const gradeByNameSection = (name: string, section: string) =>
      grades.find(
        (g) =>
          normalize(g.name) === normalize(name) &&
          normalize(g.section ?? "") === normalize(section)
      );

    const timeBlockByDayStart = (day: number, start: string) =>
      timeBlocks.find(
        (tb) => tb.dayOfWeek === day && tb.startTime.trim() === start.trim() && tb.blockType === "CLASS"
      );

    const dayMap: Record<string, number> = {
      monday: 1, lunes: 1,
      tuesday: 2, martes: 2,
      wednesday: 3, miercoles: 3, miércoles: 3,
      thursday: 4, jueves: 4,
      friday: 5, viernes: 5,
    };

    // Parse CSV
    const lines = csv.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length < 2) return NextResponse.json({ error: "CSV vacío o sin datos" }, { status: 400 });

    // Expect header: teacher,subject,grade,section,room,day,start_time
    const header = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    const requiredCols = ["teacher", "subject", "grade", "section", "room", "day", "start_time"];
    for (const col of requiredCols) {
      if (!header.includes(col)) {
        return NextResponse.json({ error: `Columna requerida faltante: "${col}"` }, { status: 400 });
      }
    }

    const col = (row: string[], name: string) => row[header.indexOf(name)]?.trim() ?? "";

    // Optional: clear assignments for a level before import
    if (clearLevel && ["PRIMARY", "LOW_SECONDARY", "SECONDARY"].includes(clearLevel)) {
      await prisma.assignment.deleteMany({ where: { grade: { level: clearLevel } } });
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",");
      const lineNum = i + 1;

      const teacherName = col(row, "teacher");
      const subjectName = col(row, "subject");
      const gradeName   = col(row, "grade");
      const section     = col(row, "section");
      const roomName    = col(row, "room");
      const dayStr      = col(row, "day").toLowerCase();
      const startTime   = col(row, "start_time");

      if (!teacherName && !subjectName) { skipped++; continue; } // blank row

      // Normalize start_time: "7:30" -> "07:30"
      const normalizedTime = startTime.includes(":") && startTime.indexOf(":") < 3
        ? startTime.padStart(5, "0")
        : startTime;

      const teacher   = byName(teachers, teacherName);
      const subject   = byName(subjects, subjectName);
      const grade     = gradeByNameSection(gradeName, section);
      const room      = roomName ? byName(rooms, roomName) : null; // empty room = null (optional)
      const dayNum    = dayMap[dayStr];
      const timeBlock = dayNum ? timeBlockByDayStart(dayNum, normalizedTime) : undefined;

      const rowErrors: string[] = [];
      if (!teacher)              rowErrors.push(`teacher "${teacherName}" no encontrado`);
      if (!subject)              rowErrors.push(`subject "${subjectName}" no encontrado`);
      if (!grade)                rowErrors.push(`grade "${gradeName}" sección "${section}" no encontrado`);
      if (roomName && !room)     rowErrors.push(`room "${roomName}" no encontrado`);
      if (!dayNum)               rowErrors.push(`day "${dayStr}" inválido`);
      if (!timeBlock)            rowErrors.push(`time block day=${dayNum} start=${normalizedTime} no encontrado`);

      if (rowErrors.length > 0) {
        errors.push(`Fila ${lineNum}: ${rowErrors.join("; ")}`);
        skipped++;
        continue;
      }

      // Upsert: skip if assignment already exists for same grade+timeBlock
      const existing = await prisma.assignment.findFirst({
        where: { gradeId: grade!.id, timeBlockId: timeBlock!.id },
      });
      if (existing) {
        await prisma.assignment.update({
          where: { id: existing.id },
          data: { teacherId: teacher!.id, subjectId: subject!.id, roomId: room!.id, status: "CONFIRMED" },
        });
      } else {
        await prisma.assignment.create({
          data: {
            teacherId: teacher!.id,
            subjectId: subject!.id,
            gradeId: grade!.id,
            roomId: room!.id,
            timeBlockId: timeBlock!.id,
            status: "CONFIRMED",
          },
        });
      }
      imported++;
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
