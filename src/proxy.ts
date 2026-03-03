import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function proxy(request: NextRequest) {
  const sessionId = request.cookies.get("auth_session")?.value ?? null;
  const userStatus = request.cookies.get("user_status")?.value ?? "ACTIVE";
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isPendingPage = pathname.startsWith("/pending");
  const isHomePage = pathname === "/";
  const isPublicPage = isAuthPage || isHomePage;

  // Unauthenticated: allow home and login, redirect everything else to login
  if (!sessionId && !isPublicPage) {
    // API routes → return 401 JSON instead of redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user on login page → redirect away
  if (sessionId && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = userStatus === "PENDING" ? "/pending" : "/";
    return NextResponse.redirect(url);
  }

  // PENDING users: only allow /pending and /login
  if (sessionId && !isPendingPage && !isAuthPage && userStatus === "PENDING") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  // ACTIVE users: redirect away from /pending
  if (sessionId && isPendingPage && userStatus === "ACTIVE") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
