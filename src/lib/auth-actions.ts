"use server";

import { lucia } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateIdFromEntropySize } from "lucia";
import bcrypt from "bcryptjs";

export async function login(formData: FormData) {
  const username = formData.get("username");
  if (typeof username !== "string" || username.length < 3 || username.length > 31) {
    return { error: "Invalid username" };
  }
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 6 || password.length > 255) {
    return { error: "Invalid password" };
  }

  const existingUser = await prisma.user.findUnique({
    where: { username }
  });
  if (!existingUser) {
    return { error: "Incorrect username or password" };
  }

  const validPassword = await bcrypt.compare(password, existingUser.password);
  if (!validPassword) {
    return { error: "Incorrect username or password" };
  }

  const session = await lucia.createSession(existingUser.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect("/");
}

export async function signup(formData: FormData) {
  const username = formData.get("username");
  if (typeof username !== "string" || username.length < 3 || username.length > 31) {
    return { error: "Invalid username" };
  }
  const password = formData.get("password");
  if (typeof password !== "string" || password.length < 6 || password.length > 255) {
    return { error: "Invalid password" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = generateIdFromEntropySize(10);

  try {
    // Check if it's the first user to make it ADMIN
    const userCount = await prisma.user.count();
    const isFirst = userCount === 0;
    const role = isFirst ? "ADMIN" : "PENDING";
    const status = isFirst ? "ACTIVE" : "PENDING";

    await prisma.user.create({
      data: {
        id: userId,
        username,
        password: passwordHash,
        role,
        status,
      }
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    (await cookies()).set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  } catch (e) {
    return { error: "Username already taken" };
  }
  return redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) {
    return { error: "Unauthorized" };
  }

  await lucia.invalidateSession(sessionId);

  const sessionCookie = lucia.createBlankSessionCookie();
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return redirect("/login");
}
