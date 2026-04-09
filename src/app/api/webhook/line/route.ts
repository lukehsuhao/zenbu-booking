import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushMessage } from "@/lib/line-messaging";
import crypto from "crypto";

function verifySignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return false;
  const hash = crypto
    .createHmac("SHA256", channelSecret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  // Verify webhook signature
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const data = JSON.parse(body);
  const events = data.events || [];

  for (const event of events) {
    // Handle follow event (user adds the bot as friend)
    if (event.type === "follow") {
      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      // Create customer record on follow — fetch LINE profile for name & picture
      try {
        const profileRes = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
          headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
        });
        const profile = profileRes.ok ? await profileRes.json() : {};
        await prisma.customer.upsert({
          where: { lineUserId },
          update: {
            displayName: profile.displayName || undefined,
            pictureUrl: profile.pictureUrl || undefined,
          },
          create: {
            lineUserId,
            displayName: profile.displayName || "",
            pictureUrl: profile.pictureUrl || "",
          },
        });
      } catch (err) {
        console.error("Failed to upsert customer on follow:", err);
      }

      continue;
    }

    // Handle message event — check for link code
    if (event.type === "message" && event.message?.type === "text") {
      const lineUserId = event.source?.userId;
      const text = (event.message.text || "").trim();

      if (!lineUserId) continue;

      // Ensure customer record exists on message
      try {
        await prisma.customer.upsert({
          where: { lineUserId },
          update: {},
          create: { lineUserId },
        });
      } catch (err) {
        console.error("Failed to upsert customer on message:", err);
      }

      // Check if the message matches a link code pattern: "LINK-XXXXXX"
      if (text.startsWith("LINK-")) {
        const code = text;

        // Find provider with this link code
        const provider = await prisma.provider.findUnique({
          where: { lineLinkCode: code },
        });

        if (provider) {
          // Link the LINE account
          await prisma.provider.update({
            where: { id: provider.id },
            data: {
              lineUserId,
              lineLinkCode: null, // Clear the code after use
            },
          });

          await pushMessage(
            lineUserId,
            `${provider.name}，您的 LINE 帳號已成功連結！\n之後系統會透過此帳號發送預約通知給您。`
          );
          continue;
        }

        // Also check TeamMember table
        const teamMember = await prisma.teamMember.findUnique({
          where: { lineLinkCode: code },
        });

        if (teamMember) {
          await prisma.teamMember.update({
            where: { id: teamMember.id },
            data: {
              lineUserId,
              lineLinkCode: null,
            },
          });

          await pushMessage(
            lineUserId,
            `${teamMember.name}，您的管理員 LINE 帳號已成功連結！\n之後系統會透過此帳號發送管理通知給您。`
          );
        } else {
          await pushMessage(
            lineUserId,
            "連結碼無效或已過期，請重新取得連結碼。"
          );
        }
        continue;
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// LINE webhook verification (GET)
export async function GET() {
  return NextResponse.json({ ok: true });
}
