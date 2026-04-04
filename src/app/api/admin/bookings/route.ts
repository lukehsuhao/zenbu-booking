import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string; providerId?: string };
  const filterProviderId = req.nextUrl.searchParams.get("providerId");
  const status = req.nextUrl.searchParams.get("status");
  const date = req.nextUrl.searchParams.get("date");
  const dateFrom = req.nextUrl.searchParams.get("dateFrom");
  const dateTo = req.nextUrl.searchParams.get("dateTo");
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const scope = req.nextUrl.searchParams.get("scope");

  const where: Record<string, unknown> = {};

  if (user.role === "provider" && scope === "own" && user.providerId) {
    where.providerId = user.providerId;
  } else if (filterProviderId) {
    where.providerId = filterProviderId;
  }

  if (status) where.status = status;
  if (serviceId) where.serviceId = serviceId;

  // Date range or single date
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom + "T00:00:00+08:00");
    if (dateTo) dateFilter.lte = new Date(dateTo + "T23:59:59+08:00");
    where.date = dateFilter;
  } else if (date) {
    where.date = { gte: new Date(date + "T00:00:00+08:00"), lte: new Date(date + "T23:59:59+08:00") };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { provider: true, service: true },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  return NextResponse.json(bookings);
}
