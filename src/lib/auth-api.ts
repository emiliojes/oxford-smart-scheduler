import { lucia } from "./auth";
import { cookies } from "next/headers";
import type { UserRole } from "./roles";

export async function validateApiRequest(allowedRoles?: UserRole[]) {
  const sessionId = (await cookies()).get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return null;

  const { user, session } = await lucia.validateSession(sessionId);
  if (!session || !user) return null;

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return null;
  }

  return user;
}
