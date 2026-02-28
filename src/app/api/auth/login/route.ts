import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lucia } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

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

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    const cookieStore = await cookies();
    cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
    // Store status in a readable cookie so middleware can redirect without DB
    cookieStore.set("user_status", user.status ?? "ACTIVE", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ success: true, status: user.status });
  } catch (error: any) {
    console.error("Login error:", error?.message, error?.stack);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
