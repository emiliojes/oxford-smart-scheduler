import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";
import { generateIdFromEntropySize } from "lucia";
import bcrypt from "bcryptjs";

const ROLE_LEVEL: Record<string, number> = { ADMIN: 3, COORDINATOR: 2, TEACHER: 1, PENDING: 0 };

export async function GET() {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        teacherId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { username, password, role } = body;

    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    if (!["ADMIN", "COORDINATOR", "TEACHER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    // Coordinator can only create users with roles <= their own
    if ((ROLE_LEVEL[role] ?? 0) > (ROLE_LEVEL[currentUser.role] ?? 0)) {
      return NextResponse.json({ error: "Cannot assign a role higher than your own" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateIdFromEntropySize(10);

    await prisma.user.create({
      data: {
        id: userId,
        username,
        password: passwordHash,
        role,
      },
    });

    return NextResponse.json({ id: userId, username, role });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error creating user" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const currentUser = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, role, password, status, teacherId } = body;

    const updateData: any = {};

    if (role && ["ADMIN", "COORDINATOR", "TEACHER"].includes(role)) {
      // Enforce hierarchy: cannot assign role higher than your own
      if ((ROLE_LEVEL[role] ?? 0) > (ROLE_LEVEL[currentUser.role] ?? 0)) {
        return NextResponse.json({ error: "Cannot assign a role higher than your own" }, { status: 403 });
      }
      updateData.role = role;
      updateData.status = "ACTIVE"; // Approving = activating
    }

    if (status && ["PENDING", "ACTIVE"].includes(status)) {
      updateData.status = status;
    }

    // teacherId can be set to a string or explicitly null to unlink
    if (teacherId !== undefined) {
      updateData.teacherId = teacherId || null;
    }

    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, role: true, status: true, teacherId: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error updating user" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    if (id === currentUser.id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Delete sessions first, then user
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}
