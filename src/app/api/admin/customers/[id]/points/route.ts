import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { id: true, points: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const transactions = await prisma.pointTransaction.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ balance: customer.points, transactions });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { amount, reason, notes } = body;

  if (typeof amount !== "number" || amount === 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { points: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  if (customer.points + amount < 0) {
    return NextResponse.json({ error: "餘額不足，無法扣點" }, { status: 400 });
  }

  const [updatedCustomer, transaction] = await prisma.$transaction([
    prisma.customer.update({
      where: { id },
      data: { points: { increment: amount } },
    }),
    prisma.pointTransaction.create({
      data: {
        customerId: id,
        amount,
        reason: reason || "admin_adjust",
        notes: notes || null,
      },
    }),
  ]);

  return NextResponse.json({
    balance: updatedCustomer.points,
    transaction,
  });
}
