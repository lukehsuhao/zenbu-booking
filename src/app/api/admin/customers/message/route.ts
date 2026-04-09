import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushMessage } from "@/lib/line-messaging";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { customerIds, lineUserIds, message } = body;

  if ((!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) &&
      (!lineUserIds || !Array.isArray(lineUserIds) || lineUserIds.length === 0)) {
    return NextResponse.json({ error: "Missing customerIds or lineUserIds" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const customers = customerIds && customerIds.length > 0
    ? await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, lineUserId: true, displayName: true },
      })
    : (lineUserIds as string[]).map((uid) => ({ id: uid, lineUserId: uid, displayName: "" }));

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const customer of customers) {
    try {
      await pushMessage(customer.lineUserId, message.trim());
      results.push({ id: customer.id, success: true });
    } catch (err) {
      console.error(`Failed to send message to ${customer.lineUserId}:`, err);
      results.push({ id: customer.id, success: false, error: String(err) });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return NextResponse.json({ successCount, failCount, results });
}
