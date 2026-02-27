import { redirect } from "next/navigation";
import { validateRequest } from "./auth-utils";

export type UserRole = "ADMIN" | "COORDINATOR" | "TEACHER";

export async function checkRole(allowedRoles: UserRole[]) {
  const { user } = await validateRequest();
  
  if (!user) {
    return redirect("/login");
  }

  if (!allowedRoles.includes(user.role as UserRole)) {
    // If not authorized, redirect to home or a forbidden page
    return redirect("/");
  }

  return user;
}

export function isAdmin(user: any) {
  return user?.role === "ADMIN";
}

export function isCoordinator(user: any) {
  return user?.role === "ADMIN" || user?.role === "COORDINATOR";
}

export function isTeacher(user: any) {
  return user?.role === "TEACHER";
}
