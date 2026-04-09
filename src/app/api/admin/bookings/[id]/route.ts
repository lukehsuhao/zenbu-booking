import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { pushMessage } from "@/lib/line-messaging";

function replaceVars(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional custom cancel message from request body
  let customCustomerMessage: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.customerMessage === "string" && body.customerMessage.trim()) {
      customCustomerMessage = body.customerMessage.trim();
    }
  } catch { /* no body or invalid JSON */ }

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.googleEventId) {
    try { await deleteCalendarEvent(booking.providerId, booking.googleEventId); } catch (err) { console.error("Failed to delete calendar event:", err); }
  }

  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });
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

  // Notify customer (use custom message if provided, otherwise use template)
  try {
    const customerMsg = customCustomerMessage
      || booking.service.cancelCustomerMsg
      || "{{姓名}} 您好，您的 {{服務名稱}} 預約已取消。\n原預約時間：{{日期}} {{時間}}\n如有疑問請聯繫我們。";
    // If custom message is provided, use as-is; otherwise apply template variables
    const finalMsg = customCustomerMessage ? customerMsg : replaceVars(customerMsg, cancelVars);
    await pushMessage(booking.lineUserId, finalMsg);
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

// Edit a booking
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { providerId, serviceId, date, startTime, customerName, customerPhone, notes, status } = body;

  // Build the update data
  const updateData: Record<string, unknown> = {};
  if (providerId !== undefined) updateData.providerId = providerId;
  if (serviceId !== undefined) updateData.serviceId = serviceId;
  if (customerName !== undefined) updateData.customerName = customerName;
  if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
  if (notes !== undefined) updateData.notes = notes;
  if (status !== undefined) updateData.status = status;

  const newDate = date || booking.date.toISOString().slice(0, 10);
  const newStartTime = startTime || booking.startTime;
  const timeChanged = (date && date !== booking.date.toISOString().slice(0, 10)) || (startTime && startTime !== booking.startTime);

  // Resolve the service for duration calculation
  const resolvedServiceId = serviceId || booking.serviceId;
  const service = serviceId && serviceId !== booking.serviceId
    ? await prisma.service.findUnique({ where: { id: serviceId } })
    : booking.service;

  if (timeChanged || serviceId) {
    // Recalculate endTime
    const [h, m] = newStartTime.split(":").map(Number);
    const endMinutes = h * 60 + m + (service?.duration || booking.service.duration);
    const newEndTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;
    updateData.startTime = newStartTime;
    updateData.endTime = newEndTime;
    if (date) updateData.date = new Date(date + "T00:00:00+08:00");
  }

  // Sync Google Calendar if time changed and event exists
  if (timeChanged && booking.googleEventId) {
    const effectiveProviderId = (providerId || booking.providerId) as string;
    try {
      await deleteCalendarEvent(booking.providerId, booking.googleEventId);
    } catch (err) {
      console.error("Failed to delete old calendar event:", err);
    }

    const provider = await prisma.provider.findUnique({ where: { id: effectiveProviderId } });
    if (provider?.googleAccessToken) {
      try {
        const endTime = updateData.endTime as string;
        const result = await createCalendarEvent(effectiveProviderId, {
          summary: `${service?.name || booking.service.name} - ${customerName || booking.customerName}`,
          description: `客戶：${customerName || booking.customerName}\n電話：${customerPhone || booking.customerPhone}${(notes ?? booking.notes) ? `\n備註：${notes ?? booking.notes}` : ""}`,
          startTime: `${newDate}T${newStartTime}:00+08:00`,
          endTime: `${newDate}T${endTime}:00+08:00`,
          reminderMinutes: [60, 1440],
        });
        updateData.googleEventId = result.eventId;
        updateData.googleMeetUrl = result.meetUrl;
      } catch (err) {
        console.error("Failed to create new calendar event:", err);
        updateData.googleEventId = null;
        updateData.googleMeetUrl = null;
      }
    } else {
      updateData.googleEventId = null;
      updateData.googleMeetUrl = null;
    }
  }

  // Recreate LINE reminders if time changed
  if (timeChanged) {
    await prisma.reminder.deleteMany({ where: { bookingId: id, sentAt: null } });

    const bookingDateTime = new Date(`${newDate}T${newStartTime}:00+08:00`);
    const lineRules = await prisma.reminderRule.findMany({
      where: { type: "line", OR: [{ serviceId: resolvedServiceId }, { serviceId: null }] },
    });

    if (lineRules.length > 0) {
      await prisma.reminder.createMany({
        data: lineRules.map((rule: { minutesBefore: number }) => ({
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
  }

  // Reward on complete
  if (body.status === "completed" && booking.status !== "completed") {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    const rewardPoints = settings?.rewardPointsOnComplete || 0;
    if (rewardPoints > 0) {
      const customer = await prisma.customer.findUnique({ where: { lineUserId: booking.lineUserId } });
      if (customer) {
        await prisma.$transaction([
          prisma.customer.update({ where: { id: customer.id }, data: { points: { increment: rewardPoints } } }),
          prisma.pointTransaction.create({
            data: { customerId: customer.id, amount: rewardPoints, reason: "reward", bookingId: booking.id, notes: "預約完成回饋" },
          }),
        ]);
      }
    }
  }

  const updated = await prisma.booking.update({ where: { id }, data: updateData });

  // Send LINE notification about the change
  try {
    const displayDate = newDate;
    const displayTime = newStartTime;
    await pushMessage(
      booking.lineUserId,
      `您的預約已更新！\n\n服務：${service?.name || booking.service.name}\n日期：${displayDate}\n時間：${displayTime} - ${(updateData.endTime as string) || booking.endTime}\n\n如有疑問請聯繫我們。`
    );
  } catch (err) {
    console.error("Failed to send LINE update notification:", err);
  }

  return NextResponse.json(updated);
}

// Approve a pending booking
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Handle notify_reschedule action
  if (body.action === "notify_reschedule") {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true, provider: true },
    });
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const dateStr = booking.date.toISOString().slice(0, 10);
    const vars = {
      "姓名": booking.customerName,
      "服務名稱": booking.service.name,
      "提供者": booking.provider.name,
      "日期": dateStr,
      "時間": `${booking.startTime} - ${booking.endTime}`,
      "電話": booking.customerPhone,
    };

    // Notify customer
    if (body.notifyCustomer) {
      try {
        const template = booking.service.rescheduleCustomerMsg || `{{姓名}} 您好，您的預約已更改。\n服務：{{服務名稱}}\n新日期：{{日期}}\n新時間：{{時間}}`;
        await pushMessage(booking.lineUserId, replaceVars(template, vars));
      } catch (err) { console.error("Failed to notify customer:", err); }
    }

    // Notify provider
    if (body.notifyProvider && booking.provider.lineUserId) {
      try {
        const template = booking.service.rescheduleProviderMsg || `【時段更改】{{姓名}} 的 {{服務名稱}} 預約已更改\n新日期：{{日期}}\n新時間：{{時間}}`;
        await pushMessage(booking.provider.lineUserId, replaceVars(template, vars));
      } catch (err) { console.error("Failed to notify provider:", err); }
    }

    return NextResponse.json({ success: true });
  }

  if (body.action !== "approve") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Booking is not pending" }, { status: 400 });
  }

  // Update status to confirmed
  await prisma.booking.update({ where: { id }, data: { status: "confirmed" } });

  // Create Google Calendar event if provider has Google connected
  const provider = await prisma.provider.findUnique({ where: { id: booking.providerId } });
  let meetUrl: string | null = null;

  if (provider?.googleAccessToken) {
    const dateStr = booking.date.toISOString().slice(0, 10);
    const serviceRules = await prisma.reminderRule.findMany({
      where: { OR: [{ serviceId: booking.serviceId }, { serviceId: null }] },
    });
    const emailRules = serviceRules.filter((r: { type: string }) => r.type === "email");
    const reminderMinutes = emailRules.map((r: { minutesBefore: number }) => r.minutesBefore);

    try {
      const result = await createCalendarEvent(booking.providerId, {
        summary: `${booking.service.name} - ${booking.customerName}`,
        description: `客戶：${booking.customerName}\n電話：${booking.customerPhone}${booking.notes ? `\n備註：${booking.notes}` : ""}`,
        startTime: `${dateStr}T${booking.startTime}:00+08:00`,
        endTime: `${dateStr}T${booking.endTime}:00+08:00`,
        reminderMinutes: reminderMinutes.length > 0 ? reminderMinutes : [60, 1440],
      });

      meetUrl = result.meetUrl;
      await prisma.booking.update({
        where: { id },
        data: {
          googleEventId: result.eventId,
          googleMeetUrl: result.meetUrl,
        },
      });
    } catch (err) {
      console.error("Failed to create calendar event on approval:", err);
    }
  }

  // Send LINE notification
  try {
    const meetInfo = meetUrl ? `\nGoogle Meet：${meetUrl}` : "";
    await pushMessage(
      booking.lineUserId,
      `您的預約已通過審核！\n\n服務：${booking.service.name}\n日期：${booking.date.toISOString().slice(0, 10)}\n時間：${booking.startTime} - ${booking.endTime}${meetInfo}\n\n如需取消預約，請聯繫我們。`
    );
  } catch (err) {
    console.error("Failed to send LINE approval notification:", err);
  }

  return NextResponse.json({ success: true });
}
