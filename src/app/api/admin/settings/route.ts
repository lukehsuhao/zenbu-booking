import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rules = await prisma.reminderRule.findMany({ orderBy: { minutesBefore: "desc" } });
  return NextResponse.json(rules);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rules } = await req.json();
  await prisma.reminderRule.deleteMany();
  await prisma.reminderRule.createMany({
    data: rules.map((r: { type: string; minutesBefore: number; serviceId?: string; messageTemplate?: string | null; notifyProvider?: boolean; providerMessageTemplate?: string | null }) => ({
      type: r.type,
      minutesBefore: r.minutesBefore,
      serviceId: r.serviceId || null,
      messageTemplate: r.messageTemplate || null,
      notifyProvider: r.notifyProvider ?? false,
      providerMessageTemplate: r.providerMessageTemplate || null,
    })),
  });

  return NextResponse.json({ success: true });
}
