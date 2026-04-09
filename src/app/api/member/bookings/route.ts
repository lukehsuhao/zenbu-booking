import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const bookings = await prisma.booking.findMany({
    where: { lineUserId },
    include: {
      service: { select: { name: true, bookingWindowDays: true, minAdvanceDays: true, showProviderSelection: true } },
      provider: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const result = bookings.map((b) => ({
    id: b.id,
    serviceId: b.serviceId,
    providerId: b.providerId,
    serviceName: b.service.name,
    providerName: b.provider.name,
    showProviderSelection: b.service.showProviderSelection,
    bookingWindowDays: b.service.bookingWindowDays,
    minAdvanceDays: b.service.minAdvanceDays,
    date: b.date.toISOString().slice(0, 10),
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status,
  }));

  return NextResponse.json(result);
}
