import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushMessage } from "@/lib/line-messaging";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { customerIds, lineUserIds, emails, message, channel = "line", subject = "通知訊息" } = body;

  const hasCustomerIds = customerIds && Array.isArray(customerIds) && customerIds.length > 0;
  const hasLineUserIds = lineUserIds && Array.isArray(lineUserIds) && lineUserIds.length > 0;
  const hasEmails = emails && Array.isArray(emails) && emails.length > 0;

  if (!hasCustomerIds && !hasLineUserIds && !hasEmails) {
    return NextResponse.json({ error: "Missing recipients" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // Validate channel
  if (channel !== "line" && channel !== "email") {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  // If email channel, check SMTP config
  if (channel === "email" && !isEmailConfigured()) {
    return NextResponse.json({
      error: "Email 尚未設定，請在 .env 設定 SMTP_HOST、SMTP_USER、SMTP_PASS 後再發送",
    }, { status: 400 });
  }

  // Fetch customer data (we need email for email channel)
  let customers: Array<{ id: string; lineUserId: string; email: string | null; displayName: string | null }> = [];
  if (hasCustomerIds) {
    customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, lineUserId: true, email: true, displayName: true },
    });
  } else if (hasLineUserIds && channel === "email") {
    // Email channel with lineUserIds — need to look up emails
    customers = await prisma.customer.findMany({
      where: { lineUserId: { in: lineUserIds } },
      select: { id: true, lineUserId: true, email: true, displayName: true },
    });
  } else if (hasLineUserIds) {
    // LINE channel with lineUserIds — no email lookup needed
    customers = (lineUserIds as string[]).map((uid) => ({
      id: uid,
      lineUserId: uid,
      email: null,
      displayName: null,
    }));
  } else if (hasEmails) {
    // Direct emails (used by providers page for email channel)
    customers = (emails as string[]).map((em) => ({
      id: em,
      lineUserId: "",
      email: em,
      displayName: null,
    }));
  }

  const results: { id: string; success: boolean; error?: string }[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const customer of customers) {
    try {
      if (channel === "line") {
        await pushMessage(customer.lineUserId, message.trim());
        results.push({ id: customer.id, success: true });
      } else {
        // Email channel
        if (!customer.email) {
          skipped.push({ id: customer.id, reason: "沒有 Email" });
          continue;
        }
        await sendEmail(customer.email, subject, message.trim());
        results.push({ id: customer.id, success: true });
      }
    } catch (err) {
      console.error(`Failed to send ${channel} message:`, err);
      results.push({ id: customer.id, success: false, error: String(err) });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const skippedCount = skipped.length;

  return NextResponse.json({ successCount, failCount, skippedCount, results, skipped });
}
