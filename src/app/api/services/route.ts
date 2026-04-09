import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    select: { id: true, name: true, description: true, duration: true, bookingWindowDays: true, minAdvanceDays: true, assignmentMode: true, showProviderSelection: true, hasDisclaimer: true, disclaimerText: true, requiresApproval: true, price: true, acceptTicket: true, acceptPoints: true, pointsPerUnit: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(services);
}
