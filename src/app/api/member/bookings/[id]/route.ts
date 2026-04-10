import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCalendarEvent, createCalendarEvent } from "@/lib/google-calendar";
import { pushMessage } from "@/lib/line-messaging";
import { getAvailableSlots } from "@/lib/availability";
import { ruleMatchesService } from "@/lib/reminder-matching";

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// Cancel a booking (member)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.lineUserId !== lineUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "confirmed" && booking.status !== "pending") {
    return NextResponse.json({ error: "此預約無法取消" }, { status: 400 });
  }

  // Delete Google Calendar event
  if (booking.googleEventId) {
    try {
      await deleteCalendarEvent(booking.providerId, booking.googleEventId);
    } catch (err) {
      console.error("Failed to delete calendar event:", err);
    }
  }

  // Update status
  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });

  // Delete unsent reminders
  await prisma.reminder.deleteMany({ where: { bookingId: id, sentAt: null } });

  // Refund payment
  if (booking.paidWith === "ticket" && booking.ticketId) {
    await prisma.customerTicket.update({
      where: { id: booking.ticketId },
      data: { used: { decrement: 1 } },
    });
  }
  if (booking.paidWith === "points" && booking.pointsUsed > 0) {
    const customer = await prisma.customer.findUnique({ where: { lineUserId: booking.lineUserId } });
    if (customer) {
      await prisma.$transaction([
        prisma.customer.update({ where: { id: customer.id }, data: { points: { increment: booking.pointsUsed } } }),
        prisma.pointTransaction.create({
          data: { customerId: customer.id, amount: booking.pointsUsed, reason: "refund", bookingId: booking.id, notes: "預約取消退點" },
        }),
      ]);
    }
  }

  // Send cancel notifications
  const provider = await prisma.provider.findUnique({ where: { id: booking.providerId } });
  const dateStr = booking.date.toISOString().slice(0, 10);
  const cancelVars: Record<string, string> = {
    "姓名": booking.customerName,
    "服務名稱": booking.service.name,
    "提供者": provider?.name || "",
    "日期": dateStr,
    "時間": `${booking.startTime} - ${booking.endTime}`,
    "電話": booking.customerPhone || "",
    "Email": "",
  };

  // Notify customer
  try {
    const customerMsg = booking.service.cancelCustomerMsg || "{{姓名}} 您好，您的 {{服務名稱}} 預約已取消。\n原預約時間：{{日期}} {{時間}}\n如有疑問請聯繫我們。";
    await pushMessage(booking.lineUserId, replaceVars(customerMsg, cancelVars));
  } catch (err) {
    console.error("Failed to send cancel notification to customer:", err);
  }

  // Notify provider
  try {
    if (provider?.lineUserId) {
      const providerMsg = booking.service.cancelProviderMsg || "【預約取消】{{姓名}} 的 {{服務名稱}} 預約已取消\n原預約時間：{{日期}} {{時間}}";
      await pushMessage(provider.lineUserId, replaceVars(providerMsg, cancelVars));
    }
  } catch (err) {
    console.error("Failed to send cancel notification to provider:", err);
  }

  // Notify admins
  try {
    if (booking.service.notifyAdminOnBooking) {
      const admins = await prisma.teamMember.findMany({ where: { lineUserId: { not: null } } });
      const adminMsg = booking.service.cancelAdminMsg || "【預約取消】{{姓名}} 的 {{服務名稱}} 預約已取消\n原預約時間：{{日期}} {{時間}}\n提供者：{{提供者}}";
      for (const admin of admins) {
        if (admin.lineUserId && admin.lineUserId !== provider?.lineUserId) {
          await pushMessage(admin.lineUserId, replaceVars(adminMsg, cancelVars));
        }
      }
    }
  } catch (err) {
    console.error("Failed to send cancel notification to admins:", err);
  }

  return NextResponse.json({ success: true });
}

// Reschedule a booking (member)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.lineUserId !== lineUserId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.status !== "confirmed" && booking.status !== "pending") {
    return NextResponse.json({ error: "此預約無法更改" }, { status: 400 });
  }

  const body = await req.json();
  const { date, startTime } = body;
  if (!date || !startTime) {
    return NextResponse.json({ error: "date and startTime are required" }, { status: 400 });
  }

  // Verify slot is available
  const availableSlots = await getAvailableSlots(
    booking.providerId,
    date,
    booking.service.duration,
    booking.service.bufferBefore,
    booking.service.bufferAfter,
    booking.service.slotInterval
  );
  const slotExists = availableSlots.some((s) => s.startTime === startTime);
  if (!slotExists) {
    return NextResponse.json({ error: "該時段已無法預約，請選擇其他時段" }, { status: 400 });
  }

  // Calculate new end time
  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + booking.service.duration;
  const newEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

  // Delete old calendar event
  if (booking.googleEventId) {
    try {
      await deleteCalendarEvent(booking.providerId, booking.googleEventId);
    } catch (err) {
      console.error("Failed to delete old calendar event:", err);
    }
  }

  // Create new calendar event
  let newEventId: string | null = null;
  let newMeetUrl: string | null = null;
  const provider = await prisma.provider.findUnique({ where: { id: booking.providerId } });
  if (provider?.googleAccessToken) {
    try {
      const result = await createCalendarEvent(booking.providerId, {
        summary: `${booking.service.name} - ${booking.customerName}`,
        description: `客戶：${booking.customerName}\n電話：${booking.customerPhone}${booking.notes ? `\n備註：${booking.notes}` : ""}`,
        startTime: `${date}T${startTime}:00+08:00`,
        endTime: `${date}T${newEndTime}:00+08:00`,
        reminderMinutes: [60, 1440],
      });
      newEventId = result.eventId;
      newMeetUrl = result.meetUrl;
    } catch (err) {
      console.error("Failed to create new calendar event:", err);
    }
  }

  // Update booking
  await prisma.booking.update({
    where: { id },
    data: {
      date: new Date(date + "T00:00:00+08:00"),
      startTime,
      endTime: newEndTime,
      googleEventId: newEventId,
      googleMeetUrl: newMeetUrl,
    },
  });

  // Recreate reminders
  await prisma.reminder.deleteMany({ where: { bookingId: id, sentAt: null } });
  const bookingDateTime = new Date(`${date}T${startTime}:00+08:00`);
  const allLineRules = await prisma.reminderRule.findMany({
    where: { type: "line", isActive: true },
  });
  const lineRules = allLineRules.filter((r) => ruleMatchesService(r, booking.serviceId));
  if (lineRules.length > 0) {
    await prisma.reminder.createMany({
      data: lineRules.map((rule) => ({
        bookingId: id,
        type: "line",
        minutesBefore: rule.minutesBefore,
        scheduledAt: new Date(bookingDateTime.getTime() - rule.minutesBefore * 60 * 1000),
      })),
    });
  } else {
    await prisma.reminder.createMany({
      data: [
        { bookingId: id, type: "line", minutesBefore: 1440, scheduledAt: new Date(bookingDateTime.getTime() - 1440 * 60 * 1000) },
        { bookingId: id, type: "line", minutesBefore: 60, scheduledAt: new Date(bookingDateTime.getTime() - 60 * 60 * 1000) },
      ],
    });
  }

  // Build template variables
  const rescheduleVars: Record<string, string> = {
    "姓名": booking.customerName,
    "服務名稱": booking.service.name,
    "提供者": provider?.name || "",
    "日期": date,
    "時間": `${startTime} - ${newEndTime}`,
    "電話": booking.customerPhone || "",
    "Email": "",
  };

  // Send LINE notification to customer
  try {
    const customerMsg = booking.service.rescheduleCustomerMsg || "{{姓名}} 您好，您的預約已更改。\n服務：{{服務名稱}}\n新日期：{{日期}}\n新時間：{{時間}}\n提供者：{{提供者}}";
    await pushMessage(booking.lineUserId, replaceVars(customerMsg, rescheduleVars));
  } catch (err) {
    console.error("Failed to send LINE reschedule notification:", err);
  }

  // Notify provider (if they have LINE connected)
  try {
    if (provider?.lineUserId) {
      const providerMsg = booking.service.rescheduleProviderMsg || "【時段更改】{{姓名}} 的 {{服務名稱}} 預約已更改\n新日期：{{日期}}\n新時間：{{時間}}";
      await pushMessage(provider.lineUserId, replaceVars(providerMsg, rescheduleVars));
    }
  } catch (err) {
    console.error("Failed to notify provider:", err);
  }

  // Notify admins (if service has admin notification enabled)
  try {
    if (booking.service.notifyAdminOnBooking) {
      const admins = await prisma.teamMember.findMany({ where: { lineUserId: { not: null } } });
      const adminMsg = booking.service.rescheduleAdminMsg || "【時段更改】{{姓名}} 的 {{服務名稱}} 預約已更改\n新日期：{{日期}}\n新時間：{{時間}}\n提供者：{{提供者}}";
      for (const admin of admins) {
        if (admin.lineUserId && admin.lineUserId !== provider?.lineUserId) {
          await pushMessage(admin.lineUserId, replaceVars(adminMsg, rescheduleVars));
        }
      }
    }
  } catch (err) {
    console.error("Failed to notify admins:", err);
  }

  return NextResponse.json({ success: true });
}
