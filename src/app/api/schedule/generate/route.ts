import { NextRequest, NextResponse } from "next/server";
import { generateAutoSchedule } from "@/lib/scheduler";
import { validateApiRequest } from "@/lib/auth-api";

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { level } = body;

    if (!level || (level !== "PRIMARY" && level !== "SECONDARY")) {
      return NextResponse.json({ error: "Nivel inválido" }, { status: 400 });
    }

    const result = await generateAutoSchedule(level);

    if (result.success) {
      return NextResponse.json({ message: `Horario generado con éxito. ${result.assigned} clases asignadas.` });
    } else {
      return NextResponse.json({
        message: `Horario generado parcialmente. ${result.assigned} clases asignadas, ${result.skipped} sin cubrir.`,
        assigned: result.assigned,
        skipped: result.skipped,
      }, { status: 200 });
    }
  } catch (error) {
    console.error("Error generating schedule:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
