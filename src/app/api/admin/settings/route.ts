import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await prisma.reminderRule.findMany({ orderBy: { minutesBefore: "desc" } });
  return NextResponse.json(rules);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rules } = await req.json();
  await prisma.reminderRule.deleteMany();
  await prisma.reminderRule.createMany({
    data: rules.map((r: { type: string; minutesBefore: number; serviceId?: string }) => ({
      type: r.type,
      minutesBefore: r.minutesBefore,
      serviceId: r.serviceId || null,
    })),
  });

  return NextResponse.json({ success: true });
}
