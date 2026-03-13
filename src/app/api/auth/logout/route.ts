import { NextResponse } from "next/server";
import { lucia } from "@/lib/auth";
import { cookies } from "next/headers";

async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
  if (sessionId) {
    try { await lucia.invalidateSession(sessionId); } catch {}
    const blank = lucia.createBlankSessionCookie();
    cookieStore.set(blank.name, blank.value, blank.attributes);
  }
  cookieStore.set("user_status", "", { maxAge: 0, path: "/" });
}

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}

// GET: allows browser to clear session via direct URL navigation, then redirects to /login
export async function GET(request: Request) {
  await clearSession();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 302 });
}
