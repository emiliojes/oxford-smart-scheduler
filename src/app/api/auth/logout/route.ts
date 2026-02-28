import { NextResponse } from "next/server";
import { lucia } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

  if (sessionId) {
    await lucia.invalidateSession(sessionId);
    const blank = lucia.createBlankSessionCookie();
    cookieStore.set(blank.name, blank.value, blank.attributes);
  }
  cookieStore.set("user_status", "", { maxAge: 0, path: "/" });

  return NextResponse.json({ success: true });
}
