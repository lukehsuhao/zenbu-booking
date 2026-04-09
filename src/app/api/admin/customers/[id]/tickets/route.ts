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

  const tickets = await prisma.customerTicket.findMany({
    where: { customerId: id },
    include: { service: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
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
  const { serviceId, total, expiresAt, notes } = body;

  if (!serviceId || typeof total !== "number" || total <= 0) {
    return NextResponse.json({ error: "Invalid serviceId or total" }, { status: 400 });
  }

  const ticket = await prisma.customerTicket.create({
    data: {
      customerId: id,
      serviceId,
      total,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes || null,
    },
    include: { service: { select: { id: true, name: true } } },
  });

  return NextResponse.json(ticket, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { role?: string };
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await params; // consume params

  const ticketId = req.nextUrl.searchParams.get("ticketId");
  if (!ticketId) {
    return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
  }

  await prisma.customerTicket.delete({ where: { id: ticketId } });

  return NextResponse.json({ ok: true });
}
