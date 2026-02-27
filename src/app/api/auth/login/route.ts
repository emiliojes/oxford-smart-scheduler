import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lucia } from "@/lib/auth";
import { verify } from "@node-rs/argon2";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    const validPassword = await verify(user.password, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
