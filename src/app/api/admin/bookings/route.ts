import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const providerId = req.nextUrl.searchParams.get("providerId");
  const status = req.nextUrl.searchParams.get("status");
  const date = req.nextUrl.searchParams.get("date");

  const where: Record<string, unknown> = {};
  if (providerId) where.providerId = providerId;
  if (status) where.status = status;
  if (date) {
    const dayStart = new Date(date + "T00:00:00+08:00");
    const dayEnd = new Date(date + "T23:59:59+08:00");
    where.date = { gte: dayStart, lte: dayEnd };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { provider: true, service: true },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  return NextResponse.json(bookings);
}
