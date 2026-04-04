import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string; providerId?: string };
  const { id } = await params;

  // Provider can only view their own availability
  if (user.role !== "admin" && user.providerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const availabilities = await prisma.availability.findMany({
    where: { providerId: id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(availabilities);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string; providerId?: string };
  const { id } = await params;

  // Provider can only edit their own availability
  if (user.role !== "admin" && user.providerId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { availabilities } = await req.json();

  await prisma.availability.deleteMany({ where: { providerId: id } });
  await prisma.availability.createMany({
    data: availabilities.map(
      (a: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        type?: string;
        specificDate?: string;
        bufferBefore?: number;
        bufferAfter?: number;
      }) => ({
        providerId: id,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        type: a.type || "available",
        specificDate: a.specificDate || null,
        bufferBefore: a.bufferBefore || 0,
        bufferAfter: a.bufferAfter || 0,
      })
    ),
  });

  return NextResponse.json({ success: true });
}
