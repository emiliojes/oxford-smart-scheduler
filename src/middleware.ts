import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionId = request.cookies.get("auth_session")?.value ?? null;
  const userStatus = request.cookies.get("user_status")?.value ?? "ACTIVE";
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname.startsWith("/login");
  const isPendingPage = pathname.startsWith("/pending");

  if (!sessionId && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (sessionId && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = userStatus === "PENDING" ? "/pending" : "/";
    return NextResponse.redirect(url);
  }

  // Redirect PENDING users away from normal pages
  if (sessionId && !isPendingPage && !isAuthPage && userStatus === "PENDING") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  // Redirect ACTIVE users away from /pending
  if (sessionId && isPendingPage && userStatus === "ACTIVE") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
