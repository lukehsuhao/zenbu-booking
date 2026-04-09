import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { lineUserId },
    select: { id: true, points: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const transactions = await prisma.pointTransaction.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ balance: customer.points, transactions });
}
