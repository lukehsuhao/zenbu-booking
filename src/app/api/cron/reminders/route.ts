import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessage } from "@/lib/line-messaging";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const pendingReminders = await prisma.reminder.findMany({
    where: {
      scheduledAt: { lte: now },
      sentAt: null,
      type: "line",
      booking: { status: "confirmed" },
    },
    include: {
      booking: { include: { service: true, provider: true } },
    },
  });

  let sent = 0;

  for (const reminder of pendingReminders) {
    const b = reminder.booking;
    const meetInfo = b.googleMeetUrl ? `\nGoogle Meet：${b.googleMeetUrl}` : "";
    const timeLabel = reminder.minutesBefore >= 1440
      ? `${Math.floor(reminder.minutesBefore / 1440)} 天`
      : `${Math.floor(reminder.minutesBefore / 60)} 小時`;

    try {
      await pushMessage(b.lineUserId,
        `提醒：您的預約將在 ${timeLabel} 後開始\n\n服務：${b.service.name}\n提供者：${b.provider.name}\n日期：${new Date(b.date).toLocaleDateString("zh-TW")}\n時間：${b.startTime} - ${b.endTime}${meetInfo}`
      );

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: now } });
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
    }
  }

  return NextResponse.json({ sent, total: pendingReminders.length });
}
