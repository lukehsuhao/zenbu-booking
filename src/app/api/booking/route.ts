import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { pushMessage } from "@/lib/line-messaging";
import { getAvailableSlots } from "@/lib/availability";
import { ruleMatchesService } from "@/lib/reminder-matching";

export async function POST(req: NextRequest) {
  const body = await req.json();
  let {
    providerId,
    serviceId,
    lineUserId,
    linePictureUrl,
    lineDisplayName,
    customerName,
    customerPhone,
    date,
    startTime,
    notes,
    paidWith,
    ticketId,
    pointsUsed,
  } = body;

  if (
    !serviceId ||
    !lineUserId ||
    !date ||
    !startTime
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Check if customer is blocked
  const existingCustomer = await prisma.customer.findUnique({ where: { lineUserId } });
  if (existingCustomer?.isBlocked) {
    return NextResponse.json(
      { error: "您的帳號已被停用，無法進行預約。如有疑問請聯繫客服。" },
      { status: 403 }
    );
  }

  // Default empty strings for optional customer fields
  if (!customerName) customerName = "";
  if (!customerPhone) customerPhone = "";

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Round-robin auto-assignment when no provider specified
  if (!providerId || service.assignmentMode === "round_robin") {
    const activeProviders = await prisma.provider.findMany({
      where: {
        isActive: true,
        providerServices: { some: { serviceId } },
      },
      select: { id: true },
    });

    if (activeProviders.length === 0) {
      return NextResponse.json(
        { error: "此服務目前無可用人員" },
        { status: 400 }
      );
    }

    // Pick the provider with fewest bookings in the next 7 days
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const providerIds = activeProviders.map((p) => p.id);

    const bookingCounts = await prisma.booking.groupBy({
      by: ["providerId"],
      where: {
        providerId: { in: providerIds },
        date: { gte: now, lte: sevenDaysLater },
        status: { not: "cancelled" },
      },
      _count: { id: true },
    });

    const countMap = new Map(bookingCounts.map((b) => [b.providerId, b._count.id]));
    let minCount = Infinity;
    let bestProviderId = providerIds[0];
    for (const pid of providerIds) {
      const count = countMap.get(pid) || 0;
      if (count < minCount) {
        minCount = count;
        bestProviderId = pid;
      }
    }
    providerId = bestProviderId;
  }

  if (!providerId) {
    return NextResponse.json(
      { error: "Missing provider" },
      { status: 400 }
    );
  }

  // Verify slot is still available
  const slots = await getAvailableSlots(
    providerId, date, service.duration,
    service.bufferBefore, service.bufferAfter, service.slotInterval
  );
  const slotExists = slots.some((s) => s.startTime === startTime);
  if (!slotExists) {
    return NextResponse.json(
      { error: "此時段已被預約，請選擇其他時段" },
      { status: 409 }
    );
  }

  // Calculate end time
  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + service.duration;
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

  // Check if service requires approval
  const isPending = service.requiresApproval === true;

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      providerId,
      serviceId,
      lineUserId,
      customerName,
      customerPhone,
      date: new Date(date + "T00:00:00+08:00"),
      startTime,
      endTime,
      notes: notes || null,
      ...(isPending ? { status: "pending" } : {}),
    },
  });

  // Process payment
  const paymentMethod = paidWith || null;
  const paymentTicketId = ticketId || null;
  const paymentPointsUsed = pointsUsed || 0;

  if (paymentMethod === "ticket" && paymentTicketId) {
    await prisma.customerTicket.update({
      where: { id: paymentTicketId },
      data: { used: { increment: 1 } },
    });
  }

  if (paymentMethod === "points" && paymentPointsUsed > 0) {
    const customer = await prisma.customer.findUnique({ where: { lineUserId } });
    if (!customer || customer.points < paymentPointsUsed) {
      return NextResponse.json({ error: "點數不足" }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.customer.update({ where: { lineUserId }, data: { points: { decrement: paymentPointsUsed } } }),
      prisma.pointTransaction.create({
        data: { customerId: customer.id, amount: -paymentPointsUsed, reason: "booking", bookingId: booking.id },
      }),
    ]);
  }

  if (paymentMethod) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paidWith: paymentMethod, ticketId: paymentTicketId, pointsUsed: paymentPointsUsed },
    });
  }

  // Check active promotions and award rewards
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    });

    for (const promo of promotions) {
      const applicableServiceIds = promo.serviceIds ? JSON.parse(promo.serviceIds) : null;
      if (applicableServiceIds && !applicableServiceIds.includes(serviceId)) continue;

      const customer = await prisma.customer.findUnique({ where: { lineUserId } });
      if (!customer) continue;

      // Award points
      if ((promo.rewardType === "points" || promo.rewardType === "both") && promo.rewardPoints > 0) {
        await prisma.$transaction([
          prisma.customer.update({ where: { id: customer.id }, data: { points: { increment: promo.rewardPoints } } }),
          prisma.pointTransaction.create({
            data: { customerId: customer.id, amount: promo.rewardPoints, reason: "reward", bookingId: booking.id, promotionId: promo.id, notes: `活動獎勵：${promo.name}` },
          }),
        ]);
      }

      // Award tickets
      if ((promo.rewardType === "tickets" || promo.rewardType === "both") && promo.rewardTickets > 0 && promo.ticketServiceId) {
        await prisma.customerTicket.create({
          data: { customerId: customer.id, serviceId: promo.ticketServiceId, total: promo.rewardTickets, promotionId: promo.id, notes: `活動獎勵：${promo.name}` },
        });
      }
    }
  } catch (err) {
    console.error("Failed to process promotion rewards:", err);
  }

  // Create Google Calendar event (skip if pending approval)
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  let meetUrl: string | null = null;

  if (!isPending && provider?.googleAccessToken) {
    const allRules = await prisma.reminderRule.findMany({ where: { isActive: true } });
    const serviceRules = allRules.filter((r) => ruleMatchesService(r, serviceId));
    const emailRules = serviceRules.filter(
      (r: { type: string; minutesBefore: number }) => r.type === "email"
    );
    const reminderMinutes = emailRules.map(
      (r: { minutesBefore: number }) => r.minutesBefore
    );

    try {
      const result = await createCalendarEvent(providerId, {
        summary: `${service.name} - ${customerName}`,
        description: `客戶：${customerName}\n電話：${customerPhone}${notes ? `\n備註：${notes}` : ""}`,
        startTime: `${date}T${startTime}:00+08:00`,
        endTime: `${date}T${endTime}:00+08:00`,
        reminderMinutes:
          reminderMinutes.length > 0 ? reminderMinutes : [60, 1440],
      });

      meetUrl = result.meetUrl;
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          googleEventId: result.eventId,
          googleMeetUrl: result.meetUrl,
        },
      });
    } catch (err) {
      console.error("Failed to create calendar event:", err);
    }
  }

  // Upsert customer record
  try {
    await prisma.customer.upsert({
      where: { lineUserId },
      update: {
        displayName: customerName || lineDisplayName || undefined,
        phone: customerPhone || undefined,
        pictureUrl: linePictureUrl || undefined,
        email: body.customerEmail || undefined,
      },
      create: {
        lineUserId,
        displayName: customerName || lineDisplayName || "",
        phone: customerPhone || "",
        pictureUrl: linePictureUrl || "",
        email: body.customerEmail || "",
      },
    });
  } catch (err) {
    console.error("Failed to upsert customer:", err);
  }

  // Create LINE reminders
  const allLineRules = await prisma.reminderRule.findMany({
    where: { type: "line", isActive: true },
  });
  const lineRules = allLineRules.filter((r) => ruleMatchesService(r, serviceId));

  const bookingDateTime = new Date(`${date}T${startTime}:00+08:00`);

  if (lineRules.length > 0) {
    await prisma.reminder.createMany({
      data: lineRules.map((rule: { minutesBefore: number }) => ({
        bookingId: booking.id,
        type: "line",
        minutesBefore: rule.minutesBefore,
        scheduledAt: new Date(
          bookingDateTime.getTime() - rule.minutesBefore * 60 * 1000
        ),
      })),
    });
  } else {
    await prisma.reminder.createMany({
      data: [
        {
          bookingId: booking.id,
          type: "line",
          minutesBefore: 1440,
          scheduledAt: new Date(
            bookingDateTime.getTime() - 1440 * 60 * 1000
          ),
        },
        {
          bookingId: booking.id,
          type: "line",
          minutesBefore: 60,
          scheduledAt: new Date(
            bookingDateTime.getTime() - 60 * 60 * 1000
          ),
        },
      ],
    });
  }

  // Send LINE confirmation
  try {
    if (isPending) {
      await pushMessage(
        lineUserId,
        `您的預約已提交，等待審核中\n\n服務：${service.name}\n日期：${date}\n時間：${startTime} - ${endTime}\n\n審核通過後將另行通知。`
      );
    } else {
      const meetInfo = meetUrl ? `\nGoogle Meet：${meetUrl}` : "";
      await pushMessage(
        lineUserId,
        `預約確認！\n\n服務：${service.name}\n日期：${date}\n時間：${startTime} - ${endTime}${meetInfo}\n\n如需取消預約，請聯繫我們。`
      );
    }
  } catch (err) {
    console.error("Failed to send LINE message:", err);
  }

  // Send admin notifications if enabled on the service
  if (service.notifyAdminOnBooking) {
    try {
      const admins = await prisma.teamMember.findMany({
        where: { lineUserId: { not: null } },
        select: { lineUserId: true },
      });

      const DEFAULT_ADMIN_BOOKING_MSG = "【新預約】{{姓名}} 預約了 {{服務名稱}}（{{日期}} {{時間}}），提供者：{{提供者}}。";
      const template = service.adminBookingMessage || DEFAULT_ADMIN_BOOKING_MSG;
      const adminMessage = template
        .replace(/\{\{姓名\}\}/g, customerName)
        .replace(/\{\{電話\}\}/g, customerPhone)
        .replace(/\{\{Email\}\}/g, body.customerEmail || "")
        .replace(/\{\{服務名稱\}\}/g, service.name)
        .replace(/\{\{提供者\}\}/g, provider?.name || "")
        .replace(/\{\{日期\}\}/g, date)
        .replace(/\{\{時間\}\}/g, `${startTime} - ${endTime}`)
        .replace(/\{\{備註\}\}/g, notes || "");

      for (const admin of admins) {
        if (admin.lineUserId) {
          try {
            await pushMessage(admin.lineUserId, adminMessage);
          } catch (adminErr) {
            console.error("Failed to send admin booking notification:", adminErr);
          }
        }
      }
    } catch (err) {
      console.error("Failed to send admin booking notifications:", err);
    }
  }

  return NextResponse.json(
    {
      id: booking.id,
      date,
      startTime,
      endTime,
      googleMeetUrl: meetUrl,
      service: service.name,
      provider: provider?.name,
    },
    { status: 201 }
  );
}
