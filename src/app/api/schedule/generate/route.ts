import { NextResponse } from "next/server";
import { generateAutoSchedule } from "@/lib/scheduler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { level } = body;

    if (!level || (level !== "PRIMARY" && level !== "SECONDARY")) {
      return NextResponse.json({ error: "Nivel inválido" }, { status: 400 });
    }

    const result = await generateAutoSchedule(level);

    if (result.success) {
      return NextResponse.json({ message: "Horario generado con éxito" });
    } else {
      return NextResponse.json({ error: "No se pudo generar un horario completo sin conflictos" }, { status: 422 });
    }
  } catch (error) {
    console.error("Error generating schedule:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
