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

  // Try to count distinct customers per promotion; fail gracefully if fields don't exist yet
  const participantsByPromo = new Map<string, Set<string>>();
  try {
    const promoIds = promotions.map((p) => p.id);
    if (promoIds.length > 0) {
      const [pointTx, tickets] = await Promise.all([
        prisma.pointTransaction.findMany({
          where: { promotionId: { in: promoIds } },
          select: { promotionId: true, customerId: true },
        }),
        prisma.customerTicket.findMany({
          where: { promotionId: { in: promoIds } },
          select: { promotionId: true, customerId: true },
        }),
      ]);
      for (const tx of pointTx) {
        if (!tx.promotionId) continue;
        if (!participantsByPromo.has(tx.promotionId)) participantsByPromo.set(tx.promotionId, new Set());
        participantsByPromo.get(tx.promotionId)!.add(tx.customerId);
      }
      for (const t of tickets) {
        if (!t.promotionId) continue;
        if (!participantsByPromo.has(t.promotionId)) participantsByPromo.set(t.promotionId, new Set());
        participantsByPromo.get(t.promotionId)!.add(t.customerId);
      }
    }
  } catch (err) {
    console.error("Failed to load participant counts:", err);
  }

  const result = promotions.map((p) => ({
    ...p,
    participantCount: participantsByPromo.get(p.id)?.size || 0,
  }));

  return NextResponse.json(result);
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
