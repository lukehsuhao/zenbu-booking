import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });

  const parsed = promotions.map((p) => ({
    ...p,
    serviceIds: p.serviceIds ? JSON.parse(p.serviceIds) : null,
  }));

  return NextResponse.json(parsed);
}
