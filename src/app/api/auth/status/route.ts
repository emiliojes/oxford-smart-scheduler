import { NextResponse } from "next/server";
import { validateRequest } from "@/lib/auth-utils";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ status: "UNAUTHENTICATED" }, { status: 401 });
    }

    const status = (user as any).status ?? "ACTIVE";

    // If user is now ACTIVE, update the cookie so middleware lets them through
    if (status === "ACTIVE") {
      const cookieStore = await cookies();
      cookieStore.set("user_status", "ACTIVE", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return NextResponse.json({ status });
  } catch {
    return NextResponse.json({ status: "ERROR" }, { status: 500 });
  }
}
