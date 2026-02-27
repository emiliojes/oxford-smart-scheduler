import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateApiRequest } from "@/lib/auth-api";

export async function GET() {
  const user = await validateApiRequest();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rooms = await prisma.room.findMany();
    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, capacity, isSpecialized, specializedFor, maxStudents } = body;

    const room = await prisma.room.create({
      data: {
        name,
        capacity: parseInt(capacity),
        isSpecialized: !!isSpecialized,
        specializedFor,
        maxStudents: maxStudents ? parseInt(maxStudents) : null,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: "Error creating room" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { id, name, capacity, isSpecialized, specializedFor, maxStudents } = body;

    const room = await prisma.room.update({
      where: { id },
      data: {
        name,
        capacity: parseInt(capacity),
        isSpecialized: !!isSpecialized,
        specializedFor,
        maxStudents: maxStudents ? parseInt(maxStudents) : null,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: "Error updating room" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await validateApiRequest(["ADMIN", "COORDINATOR"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
    }

    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting room" }, { status: 500 });
  }
}
