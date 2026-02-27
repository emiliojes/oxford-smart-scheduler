import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { validateApiRequest } from "@/lib/auth-api";

/**
 * Endpoint para que el Arduino consulte si debe sonar el timbre.
 * El Arduino debería llamar a esto cada 30-60 segundos.
 */
export async function GET() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Dom) - 6 (Sáb)
    const currentTime = format(now, "HH:mm");

    // Buscar si hay un timbre programado para este momento exacto
    const schedule = await prisma.bellSchedule.findFirst({
      where: {
        dayOfWeek: dayOfWeek,
        time: currentTime,
        active: true,
      },
    });

    if (schedule) {
      // Registrar la activación
      await prisma.bellActivation.create({
        data: {
          scheduledAt: now,
          duration: schedule.duration,
          pattern: schedule.pattern,
          manual: false,
        },
      });

      return NextResponse.json({
        ring: true,
        duration: schedule.duration,
        pattern: schedule.pattern,
      });
    }

    // Verificar si hay una activación manual pendiente (no implementado aún el flag, pero se puede extender)
    
    return NextResponse.json({ ring: false });
  } catch (error) {
    console.error("Error checking bell schedule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Endpoint para activar el timbre manualmente desde la interfaz web.
 */
export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { duration, pattern } = body;

    // Registrar activación manual
    await prisma.bellActivation.create({
      data: {
        duration: parseInt(duration) || 2000,
        pattern: pattern || "SINGLE",
        manual: true,
      },
    });

    // En un sistema real con MQTT o WebSockets, enviaríamos la señal aquí.
    // Para el modelo de polling del Arduino, el Arduino verá esta activación en el siguiente GET.
    // Agregaremos un flag en BellConfig para indicar activación inmediata.
    
    await prisma.bellConfig.updateMany({
      data: {
        status: "RING_PENDING", // Estado temporal para que el Arduino lo detecte
      },
    });

    return NextResponse.json({ success: true, message: "Señal de timbre enviada" });
  } catch (error) {
    return NextResponse.json({ error: "Error triggering bell" }, { status: 500 });
  }
}
