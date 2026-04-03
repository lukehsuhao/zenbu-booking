import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCalendarEvent } from "@/lib/google-calendar";
import { pushMessage } from "@/lib/line-messaging";
import { getAvailableSlots } from "@/lib/availability";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    providerId,
    serviceId,
    lineUserId,
    customerName,
    customerPhone,
    date,
    startTime,
    notes,
  } = body;

  if (
    !providerId ||
    !serviceId ||
    !lineUserId ||
    !customerName ||
    !customerPhone ||
    !date ||
    !startTime
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  // Verify slot is still available
  const slots = await getAvailableSlots(providerId, date, service.duration);
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
    },
  });

  // Create Google Calendar event
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
  });
  let meetUrl: string | null = null;

  if (provider?.googleAccessToken) {
    const serviceRules = await prisma.reminderRule.findMany({
      where: { OR: [{ serviceId }, { serviceId: null }] },
    });
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

  // Create LINE reminders
  const lineRules = await prisma.reminderRule.findMany({
    where: { type: "line", OR: [{ serviceId }, { serviceId: null }] },
  });

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
    const meetInfo = meetUrl ? `\nGoogle Meet：${meetUrl}` : "";
    await pushMessage(
      lineUserId,
      `預約確認！\n\n服務：${service.name}\n日期：${date}\n時間：${startTime} - ${endTime}${meetInfo}\n\n如需取消預約，請聯繫我們。`
    );
  } catch (err) {
    console.error("Failed to send LINE message:", err);
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
