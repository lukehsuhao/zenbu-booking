import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCalendarEvent } from "@/lib/google-calendar";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.googleEventId) {
    try { await deleteCalendarEvent(booking.providerId, booking.googleEventId); } catch (err) { console.error("Failed to delete calendar event:", err); }
  }

  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
  await prisma.reminder.deleteMany({ where: { bookingId: id, sentAt: null } });

  return NextResponse.json({ success: true });
}
