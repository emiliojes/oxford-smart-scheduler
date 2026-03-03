import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest } from "@/lib/auth-api";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/profile — returns current user's profile
export async function GET() {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, username: true, name: true, role: true, status: true, theme: true, teacherId: true } as any,
  });
  return NextResponse.json(profile);
}

// PUT /api/profile — updates current user's own profile
export async function PUT(request: NextRequest) {
  const user = await validateApiRequest();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, username, currentPassword, newPassword, theme, language } = await request.json();
  const updateData: any = {};

  if (name !== undefined) updateData.name = name || null;
  if (theme && ["light", "dark"].includes(theme)) updateData.theme = theme;

  if (username && username !== user.username) {
    const exists = await prisma.user.findFirst({ where: { username, NOT: { id: user.id } } });
    if (exists) return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    updateData.username = username;
  }

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 });
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
    const valid = await bcrypt.compare(currentPassword, dbUser!.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, status: true, theme: true } as any,
  });

  return NextResponse.json(updated);
}
