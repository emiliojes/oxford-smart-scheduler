import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lucia } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generateIdFromEntropySize } from "lucia";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || username.length < 3 || username.length > 31) {
      return NextResponse.json({ error: "El usuario debe tener entre 3 y 31 caracteres" }, { status: 400 });
    }
    if (!password || password.length < 6 || password.length > 255) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const userCount = await prisma.user.count();
    const isFirst = userCount === 0;
    const role = isFirst ? "ADMIN" : "PENDING";
    const status = isFirst ? "ACTIVE" : "PENDING";

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateIdFromEntropySize(10);

    await prisma.user.create({
      data: { id: userId, username, password: passwordHash, role, status },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    cookieStore.set("user_status", status, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true, status });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Nombre de usuario ya en uso" }, { status: 400 });
    }
    console.error("Signup error:", e?.message);
    return NextResponse.json({ error: "Error al registrar usuario" }, { status: 500 });
  }
}
