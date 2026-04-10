import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, getAvailableDates } from "@/lib/availability";

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("providerId");
  const date = req.nextUrl.searchParams.get("date");
  const serviceId = req.nextUrl.searchParams.get("serviceId");
  const month = req.nextUrl.searchParams.get("month");

  if (!providerId) {
    return NextResponse.json({ error: "Missing providerId" }, { status: 400 });
  }

  const service = serviceId
    ? await prisma.service.findUnique({ where: { id: serviceId } })
    : null;

  const duration = service?.duration || 30;

  if (month) {
    const [year, m] = month.split("-").map(Number);
    const dates = await getAvailableDates(
      providerId,
      year,
      m,
      duration,
      service?.bufferBefore || 0,
      service?.bufferAfter || 0,
      service?.slotInterval || 30
    );
    return NextResponse.json({ dates });
  }

  if (date) {
    const slots = await getAvailableSlots(
      providerId, date, duration,
      service?.bufferBefore || 0,
      service?.bufferAfter || 0,
      service?.slotInterval || 30
    );
    return NextResponse.json({ slots });
  }

  return NextResponse.json({ error: "Provide date or month" }, { status: 400 });
}
