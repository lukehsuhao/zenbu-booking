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

  // Load all reminder rules for provider notification lookup
  const reminderRules = await prisma.reminderRule.findMany({
    where: { type: "line" },
  });

  const DEFAULT_PROVIDER_MESSAGE = "提醒：{{姓名}} 預約了 {{服務名稱}}，時間為 {{日期}} {{時間}}。";

  let sent = 0;

  for (const reminder of pendingReminders) {
    const b = reminder.booking;
    const meetInfo = b.googleMeetUrl ? `\nGoogle Meet：${b.googleMeetUrl}` : "";
    const timeLabel = reminder.minutesBefore >= 1440
      ? `${Math.floor(reminder.minutesBefore / 1440)} 天`
      : `${Math.floor(reminder.minutesBefore / 60)} 小時`;

    try {
      // Send customer reminder
      await pushMessage(b.lineUserId,
        `提醒：您的預約將在 ${timeLabel} 後開始\n\n服務：${b.service.name}\n提供者：${b.provider.name}\n日期：${new Date(b.date).toLocaleDateString("zh-TW")}\n時間：${b.startTime} - ${b.endTime}${meetInfo}`
      );

      // Send provider notification if enabled
      const matchingRule = reminderRules.find(
        (r) => r.minutesBefore === reminder.minutesBefore &&
          (r.serviceId === b.serviceId || r.serviceId === null)
      );

      if (matchingRule?.notifyProvider && b.provider.lineUserId) {
        const template = matchingRule.providerMessageTemplate || DEFAULT_PROVIDER_MESSAGE;
        const dateStr = new Date(b.date).toLocaleDateString("zh-TW");
        const providerMessage = template
          .replace(/\{\{姓名\}\}/g, b.customerName)
          .replace(/\{\{電話\}\}/g, b.customerPhone)
          .replace(/\{\{服務名稱\}\}/g, b.service.name)
          .replace(/\{\{提供者\}\}/g, b.provider.name)
          .replace(/\{\{日期\}\}/g, dateStr)
          .replace(/\{\{時間\}\}/g, `${b.startTime} - ${b.endTime}`)
          .replace(/\{\{備註\}\}/g, b.notes || "");

        try {
          await pushMessage(b.provider.lineUserId, providerMessage);
        } catch (provErr) {
          console.error(`Failed to send provider notification for reminder ${reminder.id}:`, provErr);
        }
      }

      await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: now } });
      sent++;
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err);
    }
  }

  return NextResponse.json({ sent, total: pendingReminders.length });
}
