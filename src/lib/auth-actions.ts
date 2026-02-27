"use server";

import { lucia } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { generateIdFromEntropySize } from "lucia";
import { hash, verify } from "@node-rs/argon2";

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

  const validPassword = await verify(existingUser.password, password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });
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

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1
  });
  const userId = generateIdFromEntropySize(10);

  try {
    await prisma.user.create({
      data: {
        id: userId,
        username,
        password: passwordHash
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
