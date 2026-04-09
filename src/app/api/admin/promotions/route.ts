import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promotions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const promotion = await prisma.promotion.create({
    data: {
      name: body.name,
      description: body.description || null,
      serviceIds: body.serviceIds || null,
      rewardType: body.rewardType,
      rewardPoints: body.rewardPoints ?? 0,
      rewardTickets: body.rewardTickets ?? 0,
      ticketServiceId: body.ticketServiceId || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(promotion, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const promotion = await prisma.promotion.update({
    where: { id: body.id },
    data: {
      name: body.name,
      description: body.description || null,
      serviceIds: body.serviceIds || null,
      rewardType: body.rewardType,
      rewardPoints: body.rewardPoints ?? 0,
      rewardTickets: body.rewardTickets ?? 0,
      ticketServiceId: body.ticketServiceId || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(promotion);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as { role?: string };
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
